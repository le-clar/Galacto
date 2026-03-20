export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  preload() {
    // fundo
    this.load.image("logo", "assets/pixel-art.png");

    // nave
    this.load.spritesheet("nave", "assets/nave.png", {
      frameWidth: 28,
      frameHeight: 19,
    });

    // mapa do Tiled
    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.image("celestial-objects", "assets/celestial-objects.png");
  }

  create() {
    const { width, height } = this.scale;

    // =====================
    // FUNDO
    // =====================
    const bg = this.add.image(width / 2, height / 2, "logo");

    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY) * 1.3;

    bg.setScale(scale);
    bg.setDepth(-1);

    this.bg = bg; // salvar pra animar depois

    // =====================
    // MAPA (TILED)
    // =====================
    const map = this.make.tilemap({ key: "map" });

    const tileset = map.addTilesetImage(
      "celestial-objects",
      "celestial-objects"
    );

    this.layer = map.createLayer("elementos", tileset, 0, 0);
    this.layer.setDepth(0);

    // =====================
    // PLAYER
    // =====================
    this.player = this.add.sprite(width / 2, height * 0.85, "nave");
    this.player.setScale(3);
    this.player.setFrame(2);
    this.player.setDepth(10);

    // =====================
    // CONTROLE
    // =====================
    this.isPressing = false;
    this.pointer = null;
    this.currentFrame = 2;
    this.targetSide = null;

    this.input.on("pointerdown", (pointer) => {
      this.isPressing = true;
      this.pointer = pointer;
    });

    this.input.on("pointerup", () => {
      this.isPressing = false;
      this.targetSide = null;
    });

    // =====================
    // ANIMAÇÃO SUAVE
    // =====================
    this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => this.updateAnimation(),
    });
  }

  update() {
    // =====================
    // AUTO-SCROLL (MAPA)
    // =====================
    if (this.layer) {
      this.layer.y += 1; // velocidade do mapa
    }

    // =====================
    // PARALLAX (FUNDO)
    // =====================
    if (this.bg) {
      this.bg.y += 0.5; // mais lento que o mapa
    }

    // =====================
    // INPUT (inclinação)
    // =====================
    if (!this.isPressing || !this.pointer) return;

    const { width } = this.scale;

    if (this.pointer.x > width / 2) {
      this.targetSide = "right";
    } else {
      this.targetSide = "left";
    }
  }

  updateAnimation() {
    // 👉 direita
    if (this.targetSide === "right") {
      if (this.currentFrame > 0) {
        this.currentFrame--;
      }
    }

    // 👈 esquerda
    else if (this.targetSide === "left") {
      if (this.currentFrame < 4) {
        this.currentFrame++;
      }
    }

    // ⏸ volta pro centro
    else {
      if (this.currentFrame < 2) {
        this.currentFrame++;
      } else if (this.currentFrame > 2) {
        this.currentFrame--;
      }
    }

    this.player.setFrame(this.currentFrame);
  }
}