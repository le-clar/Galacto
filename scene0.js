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
    this.load.image("way_left", "assets/way_left.png");
    this.load.image("way_right", "assets/way_right.png");
    this.load.spritesheet("spaceship", "assets/spaceship.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.image("celestial-objects", "assets/celestial-objects.png");
  }

  create() {
    const { width, height } = this.scale;
    this.worldLayer = this.add.group();

    // Fundo
    this.bg = this.add
      .image(width / 2, height / 2, "logo")
      .setScrollFactor(0)
      .setDepth(-3);
    this.bg.setScale(
      Math.max(width / this.bg.width, height / this.bg.height) * 1.3,
    );

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage(
      "celestial-objects",
      "celestial-objects",
    );
    this.mapLayer = map
      .createLayer("elementos", tileset, -width, -height)
      .setDepth(-1)
      .setScrollFactor(0.2)
      .setScale(2);
    this.worldLayer.add(this.mapLayer);

    // Pista
    this.roadPieces = [];
    const texture = this.textures.get("way_0").getSourceImage();
    const roadScale = (width / texture.width) * 0.25;
    this.gridSize = Math.round(texture.height * roadScale);
    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.lastTurnDir = "none";
    for (let i = 0; i < 20; i++) this.generateTrackPiece();

    // NAVE
    this.carrier = this.physics.add
      .sprite(0, 0, "spaceship")
      .setScale(5)
      .setDepth(9);
    this.carrierTravelDir = "UP";
    this.carrier.lastTurnedPiece = null;
    this.carrier.setFrame(0);
    this.worldLayer.add(this.carrier);

    // PLAYER (Alien)
    this.player = this.physics.add
      .sprite(0, 0, "theo_concept")
      .setScale(3)
      .setDepth(10);
    this.playerTravelDir = "UP";
    this.player.lastTurnedPiece = null;
    this.queuedTurn = null;
    this.worldLayer.add(this.player);

    this.speed = 250;
    this.isGameOver = false;
    this.isManeuvering = false; // Flag que bloqueia a curva durante a manobra

    // PONTUAÇÃO
    this.score = 0;
    this.scoreText = this.add
      .text(30, 30, "0", {
        fontSize: "60px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
        fontFamily: "sans-serif",
      })
      .setDepth(100)
      .setScrollFactor(0);

    // CÂMERAS
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, height * 0.3);
    this.cameras.main.ignore(this.scoreText);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bg, this.worldLayer]);

    // CONTROLES REFEITOS (Sem Delay)
    this.animState = "idle";
    this.currentFrame = 0;

    // 1. Ao encostar o dedo: VIRA INSTANTANEAMENTE
    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) return;
      this.startY = pointer.y;

      const isRight = pointer.x > width / 2;
      this.attemptTurn(isRight ? "RIGHT" : "LEFT");
    });

    // 2. Ao arrastar o dedo pela tela: FAZ A MANOBRA
    this.input.on("pointermove", (pointer) => {
      if (this.isGameOver || !pointer.isDown || this.isManeuvering) return;

      const deltaY = this.startY - pointer.y;

      // Se arrastou para cima (mais de 40px)
      if (deltaY > 40) {
        this.queuedTurn = null; // Cancela a curva imediata
        this.executeManeuver("up");
      }
      // Se arrastou para baixo
      else if (deltaY < -40) {
        this.queuedTurn = null; // Cancela a curva imediata
        this.executeManeuver("down");
      }
    });

    // Loop de animação
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.updateAnimation(),
    });
  }

  executeManeuver(type) {
    if (this.isManeuvering) return;

    this.isManeuvering = true;
    this.animState = type;
    this.upStep = 0;
    this.downStep = 0;

    // GANHA OS 50 PONTOS AQUI
    this.score += 50;
    this.scoreText.setText(this.score.toString());

    if (this.score >= 10000) {
      this.isGameOver = true;
      this.scene.start("win");
    }
  }

  attemptTurn(turnIntent) {
    if (this.isManeuvering) return;

    const currentPiece = this.getPieceUnder(this.player);
    if (
      currentPiece &&
      (currentPiece.trackType === "way_left" ||
        currentPiece.trackType === "way_right")
    ) {
      this.queuedTurn = turnIntent;
      this.animState = turnIntent === "RIGHT" ? "right" : "left"; // Feedbak visual imediato
    } else {
      this.triggerFall(turnIntent, "early");
    }
  }

  generateTrackPiece() {
    let type = "way_0";
    if (this.justTurned) {
      type = "way_0";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      if (this.straightPiecesCount > 4 && Math.random() < 0.3) {
        type =
          this.lastTurnDir === "left"
            ? "way_right"
            : this.lastTurnDir === "right"
              ? "way_left"
              : Math.random() < 0.5
                ? "way_left"
                : "way_right";
        this.lastTurnDir = type === "way_left" ? "left" : "right";
        this.justTurned = true;
      }
    }
    const piece = this.add.image(this.trackCursor.x, this.trackCursor.y, type);
    piece.setDisplaySize(this.gridSize, this.gridSize).setDepth(1);
    piece.trackType = type;
    this.roadPieces.push(piece);
    this.worldLayer.add(piece);

    let angle = 0;
    if (this.trackCursor.dir === "UP") {
      if (type === "way_0") {
        this.trackCursor.y -= this.gridSize;
      } else if (type === "way_left") {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      } else {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      }
    } else if (this.trackCursor.dir === "RIGHT") {
      angle = 90;
      if (type === "way_0") {
        this.trackCursor.x += this.gridSize;
      } else if (type === "way_left") {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      } else {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      }
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_0") {
        this.trackCursor.x -= this.gridSize;
      } else if (type === "way_left") {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      } else {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      }
    } else if (this.trackCursor.dir === "DOWN") {
      angle = 180;
      if (type === "way_0") {
        this.trackCursor.y += this.gridSize;
      } else if (type === "way_left") {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      } else {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      }
    }
    piece.setAngle(angle);
  }

  triggerFall(direction, type) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.player.setFrame(direction === "LEFT" ? 5 : 6);
    this.player.setVelocity(0, 0);

    let vx = 0,
      vy = 0;
    if (this.playerTravelDir === "UP") vy = -this.speed;
    else if (this.playerTravelDir === "DOWN") vy = this.speed;
    else if (this.playerTravelDir === "RIGHT") vx = this.speed;
    else if (this.playerTravelDir === "LEFT") vx = -this.speed;

    if (direction === "LEFT") {
      vx -= 100;
    } else {
      vx += 100;
    }

    this.player.setVelocity(vx, vy);
    this.time.delayedCall(1000, () => this.scene.start("gameover"));
  }

  updateCameraRotation() {
    let targetAngle = 0;
    if (this.carrierTravelDir === "UP") targetAngle = 0;
    else if (this.carrierTravelDir === "RIGHT") targetAngle = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetAngle = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetAngle = Math.PI / 2;

    const currentRad = this.cameras.main.rotation;
    let diff = Math.atan2(
      Math.sin(targetAngle - currentRad),
      Math.cos(targetAngle - currentRad),
    );
    this.tweens.add({
      targets: this.cameras.main,
      rotation: currentRad + diff,
      duration: 250,
    });

    let offX = 0,
      offY = 0,
      dist = this.scale.height * 0.3;
    if (this.carrierTravelDir === "UP") offY = dist;
    else if (this.carrierTravelDir === "RIGHT") offX = -dist;
    else if (this.carrierTravelDir === "DOWN") offY = -dist;
    else offX = dist;

    this.tweens.add({
      targets: this.cameras.main.followOffset,
      x: offX,
      y: offY,
      duration: 250,
    });
    this.carrier.setAngle(
      this.carrierTravelDir === "RIGHT"
        ? 90
        : this.carrierTravelDir === "DOWN"
          ? 180
          : this.carrierTravelDir === "LEFT"
            ? -90
            : 0,
    );
  }

  getPieceUnder(target) {
    let closest = null,
      minDist = this.gridSize;
    for (const piece of this.roadPieces) {
      const d = Phaser.Math.Distance.Between(
        target.x,
        target.y,
        piece.x,
        piece.y,
      );
      if (d < minDist) {
        minDist = d;
        closest = piece;
      }
    }
    return closest;
  }

  update(time, delta) {
    const dirs = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

    if (!this.isGameOver) {
      this.carrier.setVelocity(
        dirs[this.carrierTravelDir][0] * this.speed,
        dirs[this.carrierTravelDir][1] * this.speed,
      );
      this.player.setVelocity(
        dirs[this.playerTravelDir][0] * this.speed,
        dirs[this.playerTravelDir][1] * this.speed,
      );
    } else {
      this.carrier.setVelocity(
        dirs[this.carrierTravelDir][0] * this.speed,
        dirs[this.carrierTravelDir][1] * this.speed,
      );
      return;
    }

    const cp = this.getPieceUnder(this.carrier);
    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_0") {
      let passed = false;
      if (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y)
        passed = true;
      else if (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y)
        passed = true;
      else if (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x)
        passed = true;
      else if (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x)
        passed = true;

      if (passed) {
        const req = cp.trackType === "way_right" ? "RIGHT" : "LEFT";
        const nextDirs = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        };
        this.carrierTravelDir = nextDirs[this.carrierTravelDir][req];
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.carrier.setFrame(req === "LEFT" ? 1 : 3);
        this.time.delayedCall(250, () => {
          if (this.carrier) this.carrier.setFrame(0);
        });
        this.updateCameraRotation();

        if (this.queuedTurn === req) {
          this.playerTravelDir = this.carrierTravelDir;
          this.player.setPosition(this.carrier.x, this.carrier.y);
          this.player.setAngle(this.carrier.angle);
          this.queuedTurn = null;
        } else {
          this.triggerFall(req, "missed");
        }
      }
    }

    const head = this.roadPieces[this.roadPieces.length - 1];
    if (
      head &&
      Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        head.x,
        head.y,
      ) < 1500
    )
      this.generateTrackPiece();
    if (this.roadPieces.length > 40) this.roadPieces.shift().destroy();

    if (!this.getPieceUnder(this.player)) {
      this.triggerFall(
        this.playerTravelDir === "LEFT" ? "LEFT" : "RIGHT",
        "missed",
      );
    }
  }

  updateAnimation() {
    if (this.isGameOver) return;
    const anims = {
      left: [1, 2],
      right: [3, 4],
      up: [7, 8, 9, 8, 7, 0],
      down: [10, 11, 10, 0],
    };

    // Animação de Curva Instantânea
    if (this.animState === "left" || this.animState === "right") {
      this.currentFrame =
        anims[this.animState][
          this.currentFrame === anims[this.animState][0] ? 1 : 0
        ];

      // Se a curva já foi concluída e resetada na atualização do jogo, o alien volta a ficar reto
      if (!this.queuedTurn) this.animState = "idle";
    }
    // Animação de Pulo
    else if (this.animState === "up") {
      this.currentFrame = anims.up[this.upStep];
      this.upStep++;
      if (this.upStep >= 6) {
        this.animState = "idle";
        this.isManeuvering = false; // MANOBRA FINALIZADA (Liberado para virar)
      }
    }
    // Animação de Agachamento
    else if (this.animState === "down") {
      this.currentFrame = anims.down[this.downStep];
      this.downStep++;
      if (this.downStep >= 4) {
        this.animState = "idle";
        this.isManeuvering = false; // MANOBRA FINALIZADA (Liberado para virar)
      }
    } else {
      this.currentFrame = 0; // Volta ao estado neutro
    }
    this.player.setFrame(this.currentFrame);
  }
}
