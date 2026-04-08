export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create() {
    const { width, height } = this.scale;

    // Fundo escurecido
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

    // Texto de Game Over
    this.add
      .text(width / 2, height * 0.4, "GAME OVER", {
        fontSize: "60px",
        fill: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Instrução para reiniciar
    const restartText = this.add
      .text(width / 2, height * 0.6, "Toque para Tentar Novamente", {
        fontSize: "24px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    // Efeito de piscar no texto
    this.tweens.add({
      targets: restartText,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // --- A MUDANÇA ESTÁ AQUI ---
    // Quando clicar, ele volta direto para o jogo (scene0)
    this.input.on("pointerdown", () => {
      this.scene.start("scene0");
    });
  }
}
