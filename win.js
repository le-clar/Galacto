export default class Win extends Phaser.Scene {
  constructor() {
    super("win");
  }

  preload() {
    // Escolha sua imagem de vitória aqui
    this.load.image("win_bg", "assets/win_bg.png");
  }

  create() {
    const { width, height } = this.scale;

    this.bg = this.add.image(width / 2, height / 2, "win_bg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    this.add
      .text(width / 2, height * 0.4, "MISSÃO CUMPRIDA!", {
        fontSize: "64px",
        fill: "#00ff00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const msg = this.add
      .text(width / 2, height * 0.6, "Toque para voltar ao Menu", {
        fontSize: "24px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: msg,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.on("pointerdown", () => this.scene.start("menu"));
  }
}
