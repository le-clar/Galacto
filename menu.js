export default class Menu extends Phaser.Scene {
  constructor() {
    // Dá o nome de 'menu' para essa cena
    super("menu");
  }

  preload() {
    // Carrega a imagem de fundo que você escolher.
    // Lembre-se de colocar o arquivo na sua pasta de assets e dar o nome correto!
    this.load.image("menu_bg", "assets/menu_bg.png");
  }

  create() {
    const { width, height } = this.scale;

    // Coloca a imagem de fundo personalizada
    this.bg = this.add.image(width / 2, height / 2, "menu_bg");

    // Ajusta a escala da imagem para preencher toda a tela
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // Adiciona o Título do Jogo 'GALACTO' no topo
    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "80px", // MODIFICAÇÃO: Título maior
        fill: "#ffffff", // Branco, mas você pode mudar!
        fontStyle: "bold",
        fontFamily: "sans-serif", // Você pode trocar por uma fonte pixel art se tiver o asset!
      })
      .setOrigin(0.5);



    this.tweens.add({
      targets: this.instructionText,
      alpha: 0,
      duration: 800,
      ease: "Power2",
      yoyo: true,
      repeat: -1,
    });

    // Quando o jogador tocar na tela, inicia a animação e o jogo
    this.input.on("pointerdown", () => {
      this.startTransition();
    });
  }

  // Função para a animação do título e troca de cena
  startTransition() {
    const { height } = this.scale;

    // Cria um tween para animar o título 'GALACTO' para cima e desaparecer
    this.tweens.add({
      targets: this.titleText,
      y: -height * 0.5, // Move para cima, para fora da tela
      alpha: 0, // Desaparece (transparência de 1 para 0)
      duration: 1000, // MODIFICAÇÃO: Duração mais lenta (1 segundo)
      ease: "Sine.easeInOut", // Facilitação suave para entrada e saída
      onComplete: () => {
        // Quando a animação terminar, inicia o jogo!
        this.scene.start("scene0");
      },
    });

    // Desativa a instrução para não atrapalhar
    this.instructionText.setVisible(false);
  }
}
