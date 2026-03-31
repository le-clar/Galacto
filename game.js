import config from "./config.js";
import Scene0 from "./scene0.js";
import Menu from "./menu.js";
import GameOver from "./gameover.js";
import Win from "./win.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add("menu", Menu);
    this.scene.add("scene0", Scene0);
    this.scene.add("gameover", GameOver);
    this.scene.add("win", Win);
    this.scene.start("menu");
  }
}

window.onload = () => {
  new Game();
};
