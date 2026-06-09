class preloader extends Phaser.Scene {
  constructor() {
    super("preloader");
  }

  init() {
    // TRANCA A TELA EM MODO PAISAGEM
    if (this.scale.lockOrientation) {
      this.scale.lockOrientation("landscape");
    }

    const { width, height } = this.scale;

    // Fundo centralizado e redimensionado para cobrir a tela (como no seu original, mas dinâmico)
    this.add.image(width / 2, height / 2, "phbg").setDisplaySize(width, height);
  }

  preload() {
    const { width, height } = this.scale;

    const barWidth = 468;
    const barHeight = 32;

    // Borda da barra na cor 0xffffff
    this.add
      .rectangle(width / 2, height / 2 + 50, barWidth, barHeight)
      .setStrokeStyle(1, 0xffffff);

    // Preenchimento da barra na cor 0xffffff
    const bar = this.add.rectangle(
      width / 2 - (barWidth / 2 - 4),
      height / 2 + 50,
      4,
      barHeight - 4,
      0xffffff,
    );

    this.load.on("progress", (progress) => {
      bar.width = 4 + (barWidth - 8) * progress;
    });

    // --- CARREGAMENTO DOS ASSETS ---
    this.load.setPath("assets/");
    this.load.image("phbg", "phbg.png");
    this.load.image("gameover", "gameover.jpg");
    this.load.image("win", "win.png");
    this.load.image("logo", "pixel-art.png");
    this.load.spritesheet("player", "player.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("way_f", "way_f.png");
    this.load.image("way_l", "way_l.png");
    this.load.image("way_r", "way_r.png");
    this.load.image("cutscene_1", "cutscene_1.png");
    this.load.image("cutscene_2", "cutscene_2.png");
    this.load.image("cutscene_3", "cutscene_3.png");
    this.load.image("cutscene_4", "cutscene_4.png");
    this.load.image("spaceship_new", "spaceship_new.png");
    this.load.audio("trick", "trick.mp3");
    this.load.audio("button", "button.mp3");
    this.load.audio("swoosh", "swoosh.mp3");
    this.load.audio("soundtrack", "soundtrack.mp3");
    this.load.audio("cutscene", "cutscene.mp3");
    this.load.audio("menu", "menu.mp3");
    this.load.audio("win", "win.mp3");
    this.load.audio("gameover", "gameover.mp3");
    this.load.image("aster_1", "aster_1.png");
    this.load.image("aster_2", "aster_2.png");
    this.load.image("aster_3", "aster_3.png");
    this.load.image("room-background", "room-background.png");
  }

  create() {
    const { width, height } = this.scale;

    this.scene.stop("preloader");
    this.scene.start("cutscene");
  }
}

export default preloader;
