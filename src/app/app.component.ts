import { CommonModule } from '@angular/common';
import { Component, viewChild } from '@angular/core';
import { EventBus } from '../game/EventBus';
import { MainMenu } from '../game/scenes/MainMenu';
import { PhaserGame } from './phaser-game.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, PhaserGame],
    templateUrl: './app.component.html',
})
export class AppComponent {
    public spritePosition = { x: 0, y: 0 };
    public canMoveSprite = false;

    // New way to get the component instance
    phaserRef = viewChild.required(PhaserGame);

    // readonly dialog = inject(MatDialog);

    private isDialogOpen = false;

    constructor() {
        // You can now safely set up your EventBus subscriptions here
        EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
            this.canMoveSprite = scene.scene.key !== 'MainMenu';
        });

        EventBus.on('test-dialog:open', () => {
            if (!this.isDialogOpen) {
                this.isDialogOpen = true;
                // this.testDialog();
            }
        });
    }

    public changeScene() {
        const scene = this.phaserRef().scene as MainMenu;
        if (scene) {
            scene.changeScene();
        }
    }

    public addSprite() {
        const scene = this.phaserRef().scene;
        if (scene) {
            const x = Phaser.Math.Between(64, scene.scale.width - 64);
            const y = Phaser.Math.Between(64, scene.scale.height - 64);

            const star = scene.add.sprite(x, y, 'star');

            scene.add.tween({
                targets: star,
                duration: 500 + Math.random() * 1000,
                alpha: 0,
                yoyo: true,
                repeat: -1,
            });
        }
    }

    // private testDialog() {
    //     console.log('test dialog');
    //     this.dialog
    //         .open(DialogComponent)
    //         .afterClosed()
    //         .subscribe(() => {
    //             this.isDialogOpen = false;
    //         });
    // }
}
