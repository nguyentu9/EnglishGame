import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

const BACKGROUND_IMAGE_KEY = 'background-image';
const FISH_KEY = 'fish';
const BACKGROUND_MUSIC_KEY = 'background-music';

const SCALE_FACTOR = 2;
export class Game extends Scene {
    private bubbles!: Phaser.GameObjects.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    preload() {
        // Load background
        this.load.image(BACKGROUND_IMAGE_KEY, 'assets/images/background.jpg');

        // Load background music
        this.load.audio(BACKGROUND_MUSIC_KEY, 'assets/audios/mermaid-song.mp3');

        // Create fish sprite
        this.load.spritesheet(FISH_KEY, 'assets/spritesheets/fish.png', {
            frameWidth: 256,
            frameHeight: 256,
        });

        // Create bubble sprite
        this.add
            .graphics()
            .fillStyle(0x87ceeb, 0.7)
            .fillCircle(16, 16, 16)
            .lineStyle(2, 0x4682b4)
            .strokeCircle(16, 16, 16)
            .generateTexture('bubble', 32, 32);
    }

    create() {
        // add background
        const background = this.add
            .image(0, 0, BACKGROUND_IMAGE_KEY)
            .setOrigin(0, 0)
            .setScale(SCALE_FACTOR);

        // Set camera
        this.cameras.main.setBounds(
            0,
            0,
            this.scale.width * SCALE_FACTOR,
            this.scale.height * SCALE_FACTOR
        );

        this.physics.world.bounds.width = this.scale.width * SCALE_FACTOR;
        this.physics.world.bounds.height = this.scale.height * SCALE_FACTOR;


        // Play background music
        const music = this.sound.add(BACKGROUND_MUSIC_KEY);
        // music.play();

        // Add overlay for underwater effect
        this.add
            .rectangle(
                0,
                0,
                this.scale.width * SCALE_FACTOR,
                this.scale.height * SCALE_FACTOR,
                0x1e40af,
                0.3
            )
            .setOrigin(0, 0);

        // Create floating bubbles for atmosphere
        this.bubbles = this.add.group();
        this.createFloatingBubbles();

        // Add fish
        this.player = this.physics.add.sprite(200, 200, FISH_KEY);
        this.player.setScale(0.5).refreshBody();

        this.player.setBounce(0.2, 0.2);
        this.player.setCollideWorldBounds(true);

        this.cameras.main.startFollow(this.player);

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

        this.player.play('fishRestRight');

        this.cursors = this.input.keyboard!.createCursorKeys();

        EventBus.emit('current-scene-ready', this);
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
            this.bubbles.add(bubble);

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
