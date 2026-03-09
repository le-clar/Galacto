import config from './config.js';
import cena1 from './scene0.js';

class Game extends Phaser.Game {
    constructor() {
        super(config);

        this.scene.add('scene0', cena1);
        this.scene.start('scene0');
    }
}

    window.onload = () => {
        window.game = new Game();
    };
