export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create() {
    const { width, height } = this.scale;

    // --- BLOCO: MÚSICA ---
    if (!this.sound.get("gameover")) {
      const musica = this.sound.add("gameover", {
        loop: true,
        volume: 0.5,
      });
      musica.play();
    } else if (!this.sound.get("gameover").isPlaying) {
      this.sound.get("gameover").play();
    }

    // --- BLOCO: IMAGEM DE GAME OVER ---
    // Adiciona a imagem no centro da tela
    this.bg = this.add.image(width / 2, height / 2, "gameover");

    // Calcula a escala para a imagem preencher/cobrir a tela toda perfeitamente
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // Torna a imagem inteira interativa (clicável), mudando o mouse para a "mãozinha"
    this.bg.setInteractive({ useHandCursor: true });

    // --- BLOCO: AÇÃO DE REINICIAR ---
    // Se o jogador clicar em qualquer lugar da imagem, reinicia o jogo
    this.bg.on("pointerdown", () => {
      this.cleanup(); // Chama a limpeza para evitar o bug de morte instantânea e parar a música
      this.scene.start("cutscene", { isRetry: true });
    });
  }

  cleanup() {
    // Para a cena de jogo se ainda estiver rodando no fundo
    try {
      if (this.scene.isActive("scene0")) {
        this.scene.stop("scene0");
      }
    } catch (e) {
      console.warn("Error stopping scene0 during cleanup:", e);
    }

    // Para a música de game over
    const gameoverSound = this.sound.get("gameover");
    if (gameoverSound && gameoverSound.isPlaying) {
      gameoverSound.stop();
    }
  }
}
