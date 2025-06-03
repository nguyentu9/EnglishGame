import { SCENE_KEYS } from '../core/SceneKeys';
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

const GOLD_BAG_KEY = 'goldbag';
export class Game extends Scene {
    private floatingBubbles!: Phaser.GameObjects.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private mysteryBoxes!: Phaser.GameObjects.Group;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    lives: number = 3;
    livesText: Phaser.GameObjects.Text;

    score: number = 0;
    scoreText: Phaser.GameObjects.Text;

    solvedQuestions: { [key: string]: boolean } = {};

    currentQuestionBox: string | null = null;
    currentMysteryBox: GameObjects.GameObject | null = null;

    questionPopup: GameObjects.Container;

    bubbleAnswersContainer: GameObjects.Container;

    constructor() {
        super(SCENE_KEYS.GAME);
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

        // Load goldbag
        this.load.image(GOLD_BAG_KEY, 'assets/images/gold-bag.png');
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

        this.lives = 3;
        this.livesText = this.add
            .text(16, 60, `Lives: ${this.lives}`, {
                fontSize: '32px',
                color: '#ffffff',
                fontFamily: 'Arial Black',
            })
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.score = 0;
        this.scoreText = this.add
            .text(16, 100, `Score: ${this.score}`, {
                fontSize: '32px',
                color: '#ffffff',
                fontFamily: 'Arial Black',
            })
            .setOrigin(0, 0)
            .setScrollFactor(0);

        // Create floating bubbles for atmosphere
        this.floatingBubbles = this.add.group();
        this.createFloatingBubbles();

        // Add fish
        this.player = this.physics.add.sprite(200, 200, FISH_KEY);
        this.player.setScale(0.35).refreshBody();

        this.player.setBounce(0.2, 0.2);
        this.player.setCollideWorldBounds(true);

        this.cameras.main.startFollow(this.player);

        this.createFishAnimation();

        this.player.play('fishRestRight');

        this.mysteryBoxes = this.physics.add.group({
            key: MYSTERY_BOX_KEY,
            repeat: 3,
            setXY: { x: 300, y: 500, stepX: 400 },
        });

        this.mysteryBoxes.children.iterate((mysteryBox: any) => {
            mysteryBox.setScale(0.15).refreshBody();
            // TODO: uncomment this
            // mysteryBox.setY(
            //     Phaser.Math.FloatBetween(mysteryBox.y - 200, mysteryBox.y + 200)
            // );

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

            this.physics.add.overlap(
                this.player,
                mysteryBox,
                this.solveChallenge,
                undefined,
                this
            );

            return true;
        });

        this.cursors = this.input.keyboard!.createCursorKeys();

        EventBus.emit('current-scene-ready', this);
    }

    createMysteryBoxes = () => {
        this.mysteryBoxes.clear(true, true);
        const startX = 200;
        const startY = 300;
        const stepX = 400;
        const repeat = 3;

        for (let i = 0; i <= repeat; i++) {
            const x = startX + stepX * i;
            const y = startY;

            const box = this.physics.add.sprite(x, y, MYSTERY_BOX_KEY);
            box.setY(Phaser.Math.FloatBetween(box.y, box.y + 200));

            this.mysteryBoxes.add(box);
            box.setScale(0.15).refreshBody();

            this.tweens.add({
                targets: box,
                y: box.y - 10,
                duration: 1000,
                repeat: -1,
                yoyo: true,
            });

            // set mystery box data
            this.setMysteryBoxData(box);

            this.physics.add.overlap(
                this.player,
                box,
                this.solveChallenge,
                undefined,
                this
            );
        }
    };

    setMysteryBoxData(box: GameObjects.GameObject) {
        // get the question
        const selectedQuestion = Phaser.Utils.Array.GetRandom(
            QUESTION_DATA,
            0,
            QUESTION_DATA.length
        );

        this.solvedQuestions[selectedQuestion.id] = false;

        box.setData('uuid', Phaser.Utils.String.UUID());
        box.setData('theQuestion', selectedQuestion);
    }

    solveChallenge(player: any, box: any) {
        // Avoid triggering the same box twice
        const boxUUID: string = box.getData('uuid');
        if (this.currentQuestionBox == boxUUID) return;
        this.currentQuestionBox = boxUUID;
        this.currentMysteryBox = box;

        const theQuestion: any = box.getData('theQuestion');

        const question: string = theQuestion.question;
        const answerTexts: string[] = theQuestion.answers;
        const correctAnswer: string = theQuestion.correctAnswer;

        // clear previous question
        this.questionPopup?.destroy();
        this.bubbleAnswersContainer?.destroy();

        this.questionPopup = this.showQuestionPopup(question);

        const questionX = 0;
        const questionY = 0;

        const positions = [
            { x: questionX - 70, y: questionY - 190 }, // top left
            { x: questionX + 70, y: questionY - 190 }, // top right
            { x: questionX - 190, y: questionY - 110 }, // left
            { x: questionX + 190, y: questionY - 110 }, // right
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

            const bubbleImage = this.add.image(0, 0, BUBBLE_QUESTION_BOX_KEY);
            bubbleImage.displayWidth = questionText.width + 30;
            bubbleImage.displayHeight = bubbleImage.displayWidth;

            // Add physics body
            this.physics.add.existing(bubbleImage);

            bubbleImage.setData('questionId', theQuestion.id);
            bubbleImage.setData('question', question);
            bubbleImage.setData('answerText', answerTexts[i]);
            bubbleImage.setData('correctAnswer', correctAnswer);

            const bubbleContainer = this.add.container(
                positions[i].x,
                positions[i].y,
                [bubbleImage, questionText]
            );
            bubbleAnswers.push(bubbleContainer);

            bubbleContainer.setSize(
                bubbleImage.displayWidth,
                bubbleImage.displayHeight
            );
            // Set interactive
            bubbleImage.setInteractive();
            bubbleImage.on('pointerdown', () => {
                console.log('Chọn:', answerTexts[i]);
            });

            this.physics.add.overlap(
                this.player,
                bubbleImage,
                this.chooseAnswer,
                undefined,
                this
            );
        }

        this.bubbleAnswersContainer = this.add.container(
            box.x,
            box.y,
            bubbleAnswers
        );
    }

    private chooseAnswer(player: any, bubbleImage: any) {
        const questionId = bubbleImage.getData('questionId');
        const answerText = bubbleImage.getData('answerText');
        const correctAnswer = bubbleImage.getData('correctAnswer');

        if (answerText == correctAnswer) {
            this.handleCorrectAnswer(questionId);
        } else {
            this.handleWrongAnswer(player);
        }

        this.currentQuestionBox = null;
        this.questionPopup?.destroy();
        this.bubbleAnswersContainer?.destroy();

        this.currentMysteryBox?.destroy(true);
        this.currentMysteryBox = null;

        if (this.mysteryBoxes.countActive(true) == 0) {
            this.time.delayedCall(1000, () => {
                this.createMysteryBoxes();
            });
        }
    }

    private handleCorrectAnswer(questionId: any) {
        this.solvedQuestions[questionId] = true;
        this.score += 10;
        this.scoreText.setText(`Score: ${this.score}`);

        const goldBag = this.add.image(
            (this.currentMysteryBox as any).x,
            (this.currentMysteryBox as any).y,
            GOLD_BAG_KEY
        );
        goldBag.displayWidth = 50;
        goldBag.displayHeight = 50;

        this.tweens.add({
            targets: goldBag,
            // x: this.cameras.main.x, // vị trí góc trái HUD
            // y: this.cameras.main.y,

            x: this.scoreText.getWorldTransformMatrix().tx,
            y: this.scoreText.getWorldTransformMatrix().ty,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                goldBag.destroy(); // Xóa túi vàng sau khi tới nơi

                //   this.addGold(10);  // Thêm 10 vàng
                const floatText = this.add
                    .text(this.player.x, this.player.y + 30, `+${10}`, {
                        fontSize: '20px',
                        color: '#ffff00',
                        fontStyle: 'bold',
                    })
                    .setOrigin(0.5);

                this.tweens.add({
                    targets: floatText,
                    y: 0,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => floatText.destroy(),
                });
            },
        });
    }

    private handleWrongAnswer(player: any) {
        if (this.lives <= 1) {
            this.changeScene();
            return;
        }
        this.lives -= 1;
        this.livesText.setText(`Lives: ${this.lives}`);

        // 1. ✴️ Làm player nhấp nháy đỏ trong 2 giây
        player.setTint(0xff0000);
        this.time.addEvent({
            delay: 200,
            repeat: 10 - 1,
            callback: () => {
                this.player.setTint(
                    this.player.tintTopLeft === 0xffffff ? 0xff0000 : 0xffffff
                );
            },
        });

        this.time.delayedCall(200 * 10, () => {
            player.setTint(0xffffff);
            //   this.isInvincible = false;
        });

        // 2. 💥 Hiệu ứng "-1 live" bay lên
        const text = this.add
            .text(player.x, player.y - 40, '-1 live', {
                fontSize: '20px',
                color: '#ff0000',
                fontStyle: 'bold',
            })
            .setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                text.destroy();
            },
        });
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
        popupGraphics.setDepth(1000);

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
        this.registry.destroy(); // destroy registry
        // this.scene.restart(); // restart current scene
        this.scene.start(SCENE_KEYS.GAME_OVER, { score: this.score });
    }
}
