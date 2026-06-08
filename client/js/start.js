export default class Start extends Phaser.Scene {
  constructor() {
    super("start");
  }

  init() {
    this.game.room = null;
  }

  preload() {
    this.load.setPath("assets/");
    this.load.image("phbg", "phbg.png");
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "phbg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "80px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => {
      this.scene.stop("start");
      this.scene.start("preloader");
    });
  }

  startTransition() {
    const { height } = this.scale;

    this.tweens.add({
      targets: this.titleText,
      y: -height * 0.5,
      alpha: 0,
      duration: 1000,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.scene.start("scene0");
      },
    });
  }
}
