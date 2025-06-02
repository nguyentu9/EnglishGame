import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    gameToUi = new EventEmitter<string>();
    uiToGame = new EventEmitter<string>();

    constructor() {}
}
