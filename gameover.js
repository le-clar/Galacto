export default class GameOver extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  preload() {
    // Carrega a imagem de fundo que você escolher para o Game Over.
    // Lembre-se de colocar o arquivo na sua pasta de assets e dar o nome correto!
    // Eu chamei de 'gameover_bg.png' aqui, mas você pode mudar.
    this.load.image("gameover_bg", "assets/gameover_bg.png");
  }

  create() {
    const { width, height } = this.scale;

    // Coloca a sua imagem de fundo personalizada
    this.bg = this.add.image(width / 2, height / 2, "gameover_bg");

    // Ajusta a escala da imagem para preencher toda a tela
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // OPCIONAL: Adiciona uma leve tinta vermelha escura na imagem para dar o clima de "perdeu"
    // Se você quiser a imagem com as cores originais, comente a linha abaixo colocando '//' no começo dela.
    this.bg.setTint(0x990000);

    // Texto de Game Over (com sombra para aparecer melhor sobre a imagem)
    this.add
      .text(width / 2, height * 0.4, "GAME OVER", {
        fontSize: "64px",
        fill: "#ff0000",
        fontStyle: "bold",
        fontFamily: "sans-serif",
        stroke: "#000000", // Borda preta
        strokeThickness: 6, // Espessura da borda
      })
      .setOrigin(0.5);

    // Instrução para voltar
    const retryText = this.add
      .text(width / 2, height * 0.6, "Toque para voltar ao MENU", {
        fontSize: "24px",
        fill: "#ffffff",
        fontFamily: "sans-serif",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Efeito de piscar no texto
    this.tweens.add({
      targets: retryText,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Ao clicar em qualquer lugar, volta para o Menu
    this.input.on("pointerdown", () => {
      this.scene.start("menu");
    });
  }
}
