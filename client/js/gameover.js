export default class Gameover extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  // Game Over screen showing retry and menu options.
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

    // --- BLOCO: FUNDO ---
    this.bg = this.add.image(width / 2, height / 2, "phbg");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);
    // Retângulo semi-transparente para escurecer o fundo
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

    // --- BLOCO: TÍTULO ---
    this.add
      .text(width / 2, height * 0.4, "GAME OVER", {
        fontSize: "60px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // --- BLOCO: CONFIGURAÇÃO DOS BOTÕES ---
    const btnWidth = Math.min(420, width * 0.6);
    const btnHeight = 64;
    const btnColor = 0x9f89d9;

    const createButton = (x, y, label, onClick) => {
      const rect = this.add
        .rectangle(x, y, btnWidth, btnHeight, btnColor)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(x, y, label, {
          fontSize: "24px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        })
        .setOrigin(0.5);

      rect.on("pointerdown", () => {
        if (onClick) onClick();
      });

      return { rect, txt };
    };

    // --- BLOCO: BOTÃO "JOGAR NOVAMENTE" CENTRALIZADO ---
    // Centralizado no meio da tela no eixo X, logo abaixo do título no eixo Y
    createButton(width / 2, height * 0.55, "Jogar Novamente", () => {
      this.cleanup(); // Garante que a música e os rastros sejam mortos antes de reiniciar
      this.scene.start("cutscene", { isRetry: true });
    });
  }

  cleanup() {
    try {
      if (this.scene.isActive("scene0")) {
        this.scene.stop("scene0");
      }
    } catch (e) {
      console.warn("Error stopping scene0 during cleanup:", e);
    }
    const gameoverSound = this.sound.get("gameover");
    if (gameoverSound && gameoverSound.isPlaying) {
      gameoverSound.stop();
    }
  }
}
