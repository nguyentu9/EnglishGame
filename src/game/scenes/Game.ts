import { EventBus } from '../EventBus';
import { GameObjects, Scene } from 'phaser';

const BACKGROUND_IMAGE_KEY = 'background-image';
const FISH_KEY = 'fish';
const BACKGROUND_MUSIC_KEY = 'background-music';
const MYSTERY_BOX_KEY = 'mystery-box';
const FLOATING_BUBBLE_KEY = 'bubble';

const SCALE_FACTOR = 1.5;
const BACKGROUND_WIDTH = 1664 * SCALE_FACTOR;
const BACKGROUND_HEIGHT = 768 * SCALE_FACTOR;

const BUBBLE_QUESTION_BOX_KEY = 'bubbleBG';

const QUESTION_DATA = [
    {
        id: '1',
        question: 'Which animal says "meow"?',
        answers: ['cat', 'dog', 'mouse', 'rat'],
        correctAnswer: 'cat',
    },
    {
        id: '2',
        question: 'I ... happy today.',
        answers: ['am', 'is', 'was', 'are'],
        correctAnswer: 'am',
    },
];

export class Game extends Scene {
    private floatingBubbles!: Phaser.GameObjects.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private mysteryBoxes!: Phaser.GameObjects.Group;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    lives: number = 3;
    livesText: any;

    score = 0;
    scoreText: Phaser.GameObjects.Text;

    solvedQuestions: { [key: string]: boolean } = {};

    currentQuestionBox: string | null = null;
    questionPopup: GameObjects.Container;
    bubbleAnswersContainer: GameObjects.Container;

    constructor() {
        super('Game');
    }

    preload() {
        // Load background
        this.load.image(BACKGROUND_IMAGE_KEY, 'assets/images/background.jpg');

        this.load.image(MYSTERY_BOX_KEY, 'assets/images/mystery-box.png');

        // Load background music
        this.load.audio(BACKGROUND_MUSIC_KEY, 'assets/audios/mermaid-song.mp3');

        // Create fish sprite
        this.load.spritesheet(FISH_KEY, 'assets/spritesheets/fish.png', {
            frameWidth: 256,
            frameHeight: 256,
        });

        // Create floating bubble sprite
        this.add
            .graphics()
            .fillStyle(0x87ceeb, 0.7)
            .fillCircle(16, 16, 16)
            .lineStyle(2, 0x4682b4)
            .strokeCircle(16, 16, 16)
            .generateTexture(FLOATING_BUBBLE_KEY, 32, 32);

        // Load bubble image
        this.load.image(BUBBLE_QUESTION_BOX_KEY, 'assets/images/bubble-2.png');
    }

    create() {
        // add background
        const background = this.add
            .image(0, 0, BACKGROUND_IMAGE_KEY)
            .setOrigin(0, 0)
            .setScale(SCALE_FACTOR);

        // Set camera
        this.cameras.main.setBounds(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT);

        this.physics.world.bounds.width = BACKGROUND_WIDTH;
        this.physics.world.bounds.height = BACKGROUND_HEIGHT;

        // Play background music
        this.addBackgroundMusic();

        // Add overlay for underwater effect
        this.add
            .rectangle(0, 0, BACKGROUND_WIDTH, BACKGROUND_HEIGHT, 0x1e40af, 0.3)
            .setOrigin(0, 0);

        // Create floating bubbles for atmosphere
        this.floatingBubbles = this.add.group();
        this.createFloatingBubbles();

        // Add fish
        this.player = this.physics.add.sprite(200, 200, FISH_KEY);
        this.player.setScale(0.4).refreshBody();

        this.player.setBounce(0.2, 0.2);
        this.player.setCollideWorldBounds(true);

        this.cameras.main.startFollow(this.player);

        this.createFishAnimation();

        this.player.play('fishRestRight');

        this.mysteryBoxes = this.physics.add.group({
            key: MYSTERY_BOX_KEY,
            repeat: 4,
            setXY: { x: 200, y: 400, stepX: 400 },
        });

        this.mysteryBoxes.children.iterate((mysteryBox: any) => {
            mysteryBox.setScale(0.15).refreshBody();
            mysteryBox.setBounceY(
                Phaser.Math.FloatBetween(mysteryBox.y - 200, mysteryBox.y + 200)
            );

            // set mystery box data
            this.setMysteryBoxData(mysteryBox);

            // Add floating animation
            this.tweens.add({
                targets: mysteryBox,
                y: mysteryBox.y - 10,
                duration: 1000,
                repeat: -1,
                yoyo: true,
            });

            return mysteryBox;
        });

        this.physics.add.overlap(
            this.player,
            this.mysteryBoxes,
            this.solveChallenge,
            undefined,
            this
        );

        this.cursors = this.input.keyboard!.createCursorKeys();

        EventBus.emit('current-scene-ready', this);
    }

    setMysteryBoxData(box: GameObjects.GameObject) {
        // get the question
        const selectedQuestion = Phaser.Utils.Array.GetRandom(
            QUESTION_DATA,
            0,
            QUESTION_DATA.length
        );

        this.solvedQuestions[selectedQuestion.id] = false;

        box.setData('uuid', Phaser.Utils.String.UUID());
        box.setData('id', selectedQuestion.id);
        box.setData('question', selectedQuestion.question);
        box.setData('answers', selectedQuestion.answers);
        box.setData('correctAnswer', selectedQuestion.correctAnswer);
    }

    solveChallenge(player: any, box: any) {
        // Avoid triggering the same box twice
        const boxUUID: string = box.getData('uuid');
        if (this.currentQuestionBox == boxUUID) return;
        this.currentQuestionBox = boxUUID;

        const question: string = box.getData('question');

        const correctAnswer: string = box.getData('answers');

        const answerTexts: string[] = box.getData('answers');

        // clear previous question
        this.questionPopup?.destroy();
        this.bubbleAnswersContainer?.destroy();

        this.questionPopup = this.showQuestionPopup(question);

        const questionX = 0;
        const questionY = 0;

        const positions = [
            { x: questionX - 70, y: questionY - 110 }, // top left
            { x: questionX + 70, y: questionY - 110 }, // top right
            { x: questionX - 160, y: questionY - 50 }, // left
            { x: questionX + 160, y: questionY - 50 }, // right
        ];

        const bubbleAnswers = [];
        for (let i = 0; i < 4; i++) {
            const questionText = this.add
                .text(0, 0, answerTexts[i], {
                    font: '13px Montserrat',
                    color: '#000000',
                    wordWrap: { width: 80 },
                })
                .setOrigin(0.5);

            const bubbleBg = this.add.image(0, 0, BUBBLE_QUESTION_BOX_KEY);
            bubbleBg.displayWidth = questionText.width + 30;
            bubbleBg.displayHeight = bubbleBg.displayWidth;

            const bubbleContainer = this.add.container(
                positions[i].x,
                positions[i].y,
                [bubbleBg, questionText]
            );

            // Set interactive
            bubbleContainer.setSize(
                bubbleBg.displayWidth,
                bubbleBg.displayHeight
            );
            bubbleContainer.setInteractive();
            bubbleContainer.on('pointerdown', () => {
                console.log('Chọn:', answerTexts[i]);
            });

            bubbleAnswers.push(bubbleContainer);
        }

        this.bubbleAnswersContainer = this.add.container(
            box.x,
            box.y,
            bubbleAnswers
        );
    }

    private showQuestionPopup(question: string) {
        // Lấy chiều rộng, chiều cao của camera (khung hình game)
        const screenWidth = this.cameras.main.width;
        // const screenHeight = this.cameras.main.height;

        // Cấu hình cho pop-up câu hỏi
        const popupWidth = screenWidth * 0.8;
        const popupHeight = 100;
        const popupX = (screenWidth - popupWidth) / 2;
        const popupY = 50; // cách cạnh trên 50px

        // Vẽ pop-up bằng Graphics
        const popupGraphics = this.add.graphics();
        popupGraphics.fillStyle(0xffffff, 1);
        // Vẽ hình chữ nhật bo tròn (bán kính 10)
        popupGraphics.fillRoundedRect(0, 0, popupWidth, popupHeight, 10);
        popupGraphics.lineStyle(2, 0x000000, 1);

        popupGraphics.setScrollFactor(0);
        popupGraphics.setDepth(100);

        // Thêm text câu hỏi, căn giữa trong pop-up
        const questionText = this.add
            .text(popupWidth / 2, popupHeight / 2, question, {
                font: '16px Montserrat',
                color: '#000000',
                align: 'center',
                wordWrap: { width: popupWidth - 20 },
            })
            .setOrigin(0.5);

        const popupContainer = this.add.container(popupX, popupY, [
            popupGraphics,
            questionText,
        ]);

        questionText.setScrollFactor(0);
        questionText.setDepth(101);

        return popupContainer;
    }

    private createFishAnimation() {
        this.anims.create({
            key: 'fishRestRight',
            frames: this.anims.generateFrameNumbers(FISH_KEY, {
                start: 0,
                end: 5,
            }),
            frameRate: 5,
            repeat: -1,
        });

        this.anims.create({
            key: 'fishRestLeft',
            frames: this.anims.generateFrameNumbers(FISH_KEY, {
                start: 6,
                end: 11,
            }),
            frameRate: 5,
            repeat: -1,
        });

        this.anims.create({
            key: 'fishSwimRight',
            frames: this.anims.generateFrameNumbers(FISH_KEY, {
                start: 12,
                end: 17,
            }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'fishSwimLeft',
            frames: this.anims.generateFrameNumbers(FISH_KEY, {
                start: 18,
                end: 23,
            }),
            frameRate: 10,
            repeat: -1,
        });
    }

    private addBackgroundMusic() {
        const music = this.sound.add(BACKGROUND_MUSIC_KEY);
        // music.play();
        return music;
    }

    override update() {
        // Turn left
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            this.player.anims.play('fishSwimLeft', true);

            // Turn right
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            this.player.anims.play('fishSwimRight', true);
        } else {
            this.player.setVelocityX(0);

            // Rest in the right if the fish was turning right before
            if (this.player.body.velocity.x > 0) {
                this.player.anims.play('fishRestRight', true);

                // Rest in the left if the fish was turning left before
            } else if (this.player.body.velocity.x < 0) {
                this.player.anims.play('fishRestLeft', true);
            }
        }

        // Go up
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
            // Go down
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        } else {
            this.player.setVelocityY(0);
        }

        if (this.cursors.space.isDown) {
            EventBus.emit('test-dialog:open', this);
            // EventBus.on('test-dialog:close', (scene: Phaser.Scene) => {});
        }
    }

    /**
     * Creates floating bubble sprites with a randomized position, size, and animation.
     * Each bubble is added to the `bubbles` group and given a floating animation
     * that moves the bubble upwards and fades it out. When the animation repeats,
     * the bubble is repositioned at the bottom of the screen with its opacity reset.
     */
    private createFloatingBubbles() {
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, this.cameras.main.width);
            const y = Phaser.Math.Between(0, this.cameras.main.height);

            const bubble = this.add.circle(
                x,
                y,
                Phaser.Math.Between(2, 8),
                0xffffff,
                0.3
            );
            this.floatingBubbles.add(bubble);

            // Add floating animation
            this.tweens.add({
                targets: bubble,
                y: y - Phaser.Math.Between(50, 200),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                onRepeat: () => {
                    bubble.y = this.cameras.main.height + 20;
                    bubble.x = Phaser.Math.Between(0, this.cameras.main.width);
                    bubble.alpha = 0.3;
                },
            });
        }
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}
