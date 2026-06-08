import config from "./config.js";
import Scene0 from "./scene0.js";
import Start from "./start.js";
import preloader from "./preloader.js";
import GameOver from "./gameover.js";
import Win from "./win.js";
import Cutscene from "./cutscene.js";
import finalFeliz from "./final-feliz.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add("start", Start);
    this.scene.add("preloader", preloader);

    // --- 2. ADICIONAR A CUTSCENE AQUI ---
    this.scene.add("cutscene", Cutscene);

    this.scene.add("scene0", Scene0);
    this.scene.add("gameover", GameOver);
    this.scene.add("win", Win);
    this.scene.add("finalFeliz", finalFeliz);
    this.scene.start("start");

    const tryLockOrientation = async () => {
      const orientation =
        screen.orientation || screen.mozOrientation || screen.msOrientation;
      if (orientation && typeof orientation.lock === "function") {
        try {
          await orientation.lock("landscape");
        } catch (error) {
          console.warn("Orientation lock unavailable:", error);
        }
      }
    };

    document.addEventListener(
      "pointerdown",
      () => {
        tryLockOrientation();
      },
      { once: true },
    );
  }
}

window.onload = () => {
  new Game();
};
