export default class Win extends Phaser.Scene {
  constructor() {
    super("win");
  }

  // Carrega a nova imagem antes da cena iniciar
  preload() {
    this.load.image("win_img", "assets/win.png");
  }

  // Win scene shown after the player completes a story run successfully.
  create() {
    const { width, height } = this.scale;

    // Trocado de "phbg" para "win_img"
    this.bg = this.add.image(width / 2, height / 2, "win_img");
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // MÚSICA
    if (!this.sound.get("win")) {
      const musica = this.sound.add("win", {
        loop: true,
        volume: 0.5,
      });
      musica.play();
    } else if (!this.sound.get("win").isPlaying) {
      this.sound.get("win").play();
    }

    this.add
      .text(width / 2, height * 0.4, "Venceu!", {
        fontSize: "40px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada", // Borda removida aqui
      })
      .setOrigin(0.5);

    this.input.on("pointerdown", () => {
      if (!this.game.isSpectator) {
        let isFirstWin = false;

        try {
          // Verifica se o jogador já ganhou antes
          const hasWonBefore = localStorage.getItem("galacto_hasWon");

          if (!hasWonBefore) {
            isFirstWin = true; // É a primeira vez!
          }

          // Agora sim, salva que ele já ganhou para as próximas vezes
          localStorage.setItem("galacto_hasWon", "1");
        } catch (e) {
          // ignore
        }

        // Decide para qual cena ir
        const nextScene = isFirstWin ? "finalFeliz" : "start";

        // Se quiser que a música pare ao sair da tela de vitória, descomente a linha abaixo:
        this.sound.get("win").stop();

        this.scene.start(nextScene);
      }
    });
  }
}
