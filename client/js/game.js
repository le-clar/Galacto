import config from "./config.js";
import Scene0 from "./scene0.js";
import Start from "./start.js";
import preloader from "./preloader.js";
import Menu from "./menu.js";
import Spectate from "./spectate.js";
import NameEntry from "./nameentry.js";
import Leaderboard from "./leaderboard.js";
import GameOver from "./gameover.js";
import Win from "./win.js";
import Cutscene from "./cutscene.js";
import finalFeliz from "./final-feliz.js";

class Game extends Phaser.Game {
  constructor() {
    super(config);
    this.scene.add("start", Start);
    this.scene.add("preloader", preloader);
    this.scene.add("menu", Menu);
    // room removed; add spectate scene for watching matches
    this.scene.add("spectate", Spectate);
    this.scene.add("nameentry", NameEntry);
    this.scene.add("leaderboard", Leaderboard);

    // --- 2. ADICIONAR A CUTSCENE AQUI ---
    this.scene.add("cutscene", Cutscene);

    this.scene.add("scene0", Scene0);
    this.scene.add("gameover", GameOver);
    this.scene.add("win", Win);
    this.scene.add("finalFeliz", finalFeliz);
    this.scene.start("start");

    const getSocketUrl = () => {
      if (location.hostname.match(/localhost|127\.0\.0\.1/)) {
        return `${location.protocol}//localhost:3000`;
      }
      if (location.hostname.match(/\.app\.github\.dev$/)) {
        return `${location.protocol}//${location.hostname.replace(/-8080\.app\.github\.dev$/, "-3000.app.github.dev")}`;
      }
      if (location.port === "8080") {
        return `${location.protocol}//${location.hostname}:3000`;
      }
      return null;
    };

    const socketUrl = getSocketUrl();
    this.socket = socketUrl
      ? io(socketUrl, {
          transports: ["polling", "websocket"],
          path: "/socket.io",
        })
      : io({ transports: ["polling", "websocket"], path: "/socket.io" });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err);
    });

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

    this.socket.on("connect", () => {
      console.log("Socket ID:", this.socket.id);

      this.socket.on("change-scene", (scene) => {
        const activeScenes = this.scene.getScenes(true);
        activeScenes.forEach((s) => {
          if (s.scene.key !== scene) {
            this.scene.stop(s.scene.key);
          }
        });
        const isAlreadyActive = activeScenes.some((s) => s.scene.key === scene);

        if (!isAlreadyActive) {
          console.log("Changing scene to:", scene);
          this.scene.start(scene);
        }
      });
    });
  }
}

window.onload = () => {
  new Game();
};
