export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  preload() {
    this.load.image("logo", "assets/pixel-art.png");

    this.load.spritesheet("theo_concept", "assets/theo_concept.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image("way_0", "assets/way_0.png");

    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.image("celestial-objects", "assets/celestial-objects.png");
  }

  create() {
    const { width, height } = this.scale;

    // =====================
    // FUNDO
    // =====================
    const bg = this.add.image(width / 2, height / 2, "logo");
    const bgScale = Math.max(width / bg.width, height / bg.height) * 1.3;
    bg.setScale(bgScale);
    bg.setDepth(-3);
    this.bg = bg;

    // =====================
    // MAPA
    // =====================
    const map = this.make.tilemap({ key: "map" });

    const tileset = map.addTilesetImage(
      "celestial-objects",
      "celestial-objects",
    );

    this.mapLayer = map.createLayer("elementos", tileset, 0, 0);
    this.mapLayer.setDepth(-1);

    this.mapHeight = map.heightInPixels;
    this.mapLayer.y = height - this.mapHeight;

    // =====================
    // ESTRADA
    // =====================
    const texture = this.textures.get("way_0").getSourceImage();
    const roadScale = (width / texture.width) * 0.25;

    this.roadWidth = Math.round(texture.width * roadScale);
    this.roadHeight = Math.round(texture.height * roadScale);

    this.roadPieces = [];

    const piecesNeeded = Math.ceil(height / this.roadHeight) + 3;

    for (let i = 0; i < piecesNeeded; i++) {
      const piece = this.add.image(
        width / 2,
        height - i * this.roadHeight,
        "way_0",
      );

      piece.setOrigin(0.5, 1);
      piece.setDisplaySize(this.roadWidth, this.roadHeight);
      piece.setDepth(1);

      this.roadPieces.push(piece);
    }

    // =====================
    // PLAYER
    // =====================
    this.player = this.add.sprite(width / 2, height - 20, "theo_concept");

    this.player.setOrigin(0.5, 1);
    this.player.setScale(3);
    this.player.setFrame(0);
    this.player.setDepth(10);

    // =====================
    // CONTROLE
    // =====================
    this.animState = "idle";
    this.currentFrame = 0;
    this.startY = 0;

    this.input.on("pointerdown", (pointer) => {
      this.startY = pointer.y;

      if (pointer.x > width / 2) {
        this.animState = "right";
      } else {
        this.animState = "left";
      }
    });

    this.input.on("pointerup", (pointer) => {
      const deltaY = this.startY - pointer.y;

      if (deltaY > 50) {
        this.animState = "up";
        this.upStep = 0;
      } else if (deltaY < -50) {
        this.animState = "down";
        this.downStep = 0;
      } else {
        this.animState = "returning";
      }
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.updateAnimation(),
    });
  }

  update() {
    const speed = 2;

    // =====================
    // MAPA
    // =====================
    if (this.mapLayer) {
      this.mapLayer.y += speed;

      if (this.mapLayer.y >= this.scale.height) {
        this.mapLayer.y = this.scale.height - this.mapHeight;
      }
    }

    // =====================
    // ESTRADA
    // =====================
    for (const piece of this.roadPieces) {
      piece.y += speed;
    }

    for (const piece of this.roadPieces) {
      if (piece.y >= this.scale.height + this.roadHeight) {
        const highestPiece = this.roadPieces.reduce((prev, curr) =>
          curr.y < prev.y ? curr : prev,
        );

        piece.y = highestPiece.y - this.roadHeight;
      }
    }

    // =====================
    // LIMITE VERTICAL (WRAP)
    // =====================
    const topLimit = 50; // ajuste se quiser
    const bottomLimit = this.scale.height - 20;

    if (this.player.y < topLimit) {
      this.player.y = bottomLimit;
    }

    // =====================
    // FUNDO
    // =====================
    if (this.bg) {
      this.bg.y += 0.3;

      // loop do fundo
      if (this.bg.y >= this.scale.height + this.bg.displayHeight / 2) {
        this.bg.y = this.scale.height / 2;
      }
    }
  }

  updateAnimation() {
    if (this.animState === "left") {
      if (this.currentFrame === 0) this.currentFrame = 1;
      else if (this.currentFrame === 1) this.currentFrame = 2;
    } else if (this.animState === "right") {
      if (this.currentFrame === 0) this.currentFrame = 3;
      else if (this.currentFrame === 3) this.currentFrame = 4;
    } else if (this.animState === "up") {
      const seq = [7, 8, 9, 8, 7, 0];
      this.currentFrame = seq[this.upStep++];
      if (this.upStep >= seq.length) {
        this.animState = "idle";
        this.upStep = 0;
      }
    } else if (this.animState === "down") {
      const seq = [10, 11, 10, 0];
      this.currentFrame = seq[this.downStep++];
      if (this.downStep >= seq.length) {
        this.animState = "idle";
        this.downStep = 0;
      }
    } else if (this.animState === "returning") {
      if (this.currentFrame === 4) this.currentFrame = 3;
      else if (this.currentFrame === 3) {
        this.currentFrame = 0;
        this.animState = "idle";
      } else if (this.currentFrame === 2) this.currentFrame = 1;
      else if (this.currentFrame === 1) {
        this.currentFrame = 0;
        this.animState = "idle";
      }
    }

    this.player.setFrame(this.currentFrame);
  }
}
