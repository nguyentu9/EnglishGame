import { SCENE_KEYS } from '../core/SceneKeys';
import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText: Phaser.GameObjects.Text;
    finalScore: number;

    constructor() {
        super(SCENE_KEYS.GAME_OVER);
    }

    init(data: any) {
        this.finalScore = data?.score || 0;
    }

    create() {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x2162e3);

        // this.background = this.add.image(512, 384, 'background');
        // this.background.setAlpha(0.5);

        this.gameOverText = this.add
            .text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 100,
                'Game Over',
                {
                    fontFamily: 'Arial Black',
                    fontSize: 64,
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 8,
                    align: 'center',
                }
            )
            .setOrigin(0.5)
            .setDepth(100);

        this.add
            .text(
                this.camera.width / 2,
                470,
                `Your Score: ${this.finalScore}`,
                {
                    fontSize: 32,
                    color: '#ffffff',
                }
            )
            .setOrigin(0.5);

        const restartButton = this.add
            .text(this.camera.width / 2, 530, '🔁 Play Again', {
                fontSize: 32,
                color: '#fff',
                fontStyle: 'bold',
                align: 'center',
                padding: { x: 20, y: 10 },
            })
            .setOrigin(0.5)
            .setInteractive();

        restartButton.on('pointerdown', () => {
            this.scene.start(SCENE_KEYS.GAME);
        });

        EventBus.emit('current-scene-ready', this);
    }

    changeScene() {
        this.scene.start(SCENE_KEYS.GAME);
    }
}
