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

    // --- MUDANÇA DE VISUAL DAS ESTRADAS NO PRELOAD ---
    this.load.image("way_f", "assets/way_f.png"); // Antigo way_0
    this.load.image("way_l", "assets/way_l.png"); // Antigo way_left
    this.load.image("way_r", "assets/way_r.png"); // Antigo way_right

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

    this.roadPieces = [];
    // --- MUDANÇA: Usando a textura way_f para calcular o grid ---
    const texture = this.textures.get("way_f").getSourceImage();
    const roadScale = (width / texture.width) * 0.25;
    this.gridSize = Math.round(texture.height * roadScale);

    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.lastTurnDir = "none";
    for (let i = 0; i < 20; i++) this.generateTrackPiece();

    this.carrier = this.physics.add
      .sprite(0, 0, "spaceship")
      .setScale(5)
      .setDepth(9);
    this.carrierTravelDir = "UP";
    this.carrier.lastTurnedPiece = null;
    this.carrier.setFrame(0);
    this.worldLayer.add(this.carrier);

    this.player = this.physics.add
      .sprite(0, 0, "theo_concept")
      .setScale(3)
      .setDepth(10);
    this.playerTravelDir = "UP";
    this.queuedTurn = null;
    this.worldLayer.add(this.player);

    this.speed = 250;
    this.isGameOver = false;
    this.isManeuvering = false;
    this.isFalling = false;
    this.swipeDetected = false;
    this.touchActive = false;

    this.score = 0;
    this.scoreText = this.add
      .text(30, 30, "0", {
        fontSize: "60px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setDepth(100)
      .setScrollFactor(0);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, height * 0.3);
    this.cameras.main.ignore(this.scoreText);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bg, this.worldLayer]);

    this.animState = "idle";
    this.currentFrame = 0;

    // CONTROLES
    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) return;
      this.touchActive = true;
      this.startY = pointer.y;
      this.swipeDetected = false;
    });

    this.input.on("pointermove", (pointer) => {
      if (
        this.isGameOver ||
        this.isManeuvering ||
        !pointer.isDown ||
        !this.touchActive
      )
        return;
      const deltaY = this.startY - pointer.y;
      if (Math.abs(deltaY) > 40) {
        this.swipeDetected = true;
        this.executeManeuver(deltaY > 0 ? "up" : "down");
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (!this.touchActive) return;
      this.touchActive = false;

      if (this.isGameOver || this.isManeuvering) return;
      if (!this.swipeDetected) {
        const isRight = pointer.x > width / 2;
        this.attemptTurn(isRight ? "RIGHT" : "LEFT");
      }
    });

    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => this.updateAnimation(),
    });
  }

  // --- LOGICA DE triggerFall (frame config permanece igual pois refere-se ao spritesheet do alien) ---
  triggerFall(direction) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.animState = "falling_sequence";

    const animConfig = {
      LEFT: { frames: [1, 2, 5], impulse: -250 },
      RIGHT: { frames: [3, 4, 6], impulse: 250 },
    };
    const config = animConfig[direction];

    const frameDelay = 120;

    this.time.delayedCall(0, () => {
      this.player.setFrame(config.frames[0]);
    });

    this.time.delayedCall(frameDelay, () => {
      if (this.player) this.player.setFrame(config.frames[1]);
    });

    this.time.delayedCall(frameDelay * 2, () => {
      if (!this.player || !this.player.body) return;

      this.player.setFrame(config.frames[2]);
      this.isFalling = true;
      this.player.body.setAllowGravity(false);

      let vx = 0,
        vy = 0;
      if (this.playerTravelDir === "UP") vy = -this.speed;
      else if (this.playerTravelDir === "DOWN") vy = this.speed;
      else if (this.playerTravelDir === "RIGHT") vx = this.speed;
      else if (this.playerTravelDir === "LEFT") vx = -this.speed;

      vx += config.impulse;
      this.player.body.setVelocity(vx, vy);
    });

    const totalWaitTime = frameDelay * 2 + 1000;
    this.time.delayedCall(totalWaitTime, () => {
      this.scene.start("gameover");
    });
  }

  attemptTurn(turnIntent) {
    if (this.isManeuvering || this.isGameOver) return;
    const currentPiece = this.getPieceUnder(this.carrier);

    // --- MUDANÇA: Verificando tipo way_f ---
    if (currentPiece && currentPiece.trackType === "way_f") {
      this.triggerFall(turnIntent);
      return;
    }

    // --- MUDANÇA: Verificando tipos way_l e way_r ---
    if (
      currentPiece &&
      (currentPiece.trackType === "way_l" || currentPiece.trackType === "way_r")
    ) {
      const correctDir = currentPiece.trackType === "way_r" ? "RIGHT" : "LEFT";
      if (turnIntent === correctDir) {
        this.queuedTurn = turnIntent;
        this.animState = turnIntent === "RIGHT" ? "right" : "left";
        this.turnStep = 0;
      } else {
        this.triggerFall(turnIntent);
      }
    }
  }

  executeManeuver(type) {
    if (this.isManeuvering) return;
    this.isManeuvering = true;
    this.animState = type;
    this.upStep = 0;
    this.downStep = 0;
    this.queuedTurn = null;
    this.score += 50;
    this.scoreText.setText(this.score.toString());
    if (this.score >= 10000) {
      this.isGameOver = true;
      this.scene.start("win");
    }
  }

  generateTrackPiece() {
    // --- MUDANÇA: Nomes novos na lógica de geração ---
    let type = "way_f";
    if (this.justTurned) {
      type = "way_f";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      if (this.straightPiecesCount > 4 && Math.random() < 0.3) {
        // Escolhe entre way_r e way_l
        type =
          this.lastTurnDir === "left"
            ? "way_r"
            : this.lastTurnDir === "right"
              ? "way_l"
              : Math.random() < 0.5
                ? "way_l"
                : "way_r";
        this.lastTurnDir = type === "way_l" ? "left" : "right";
        this.justTurned = true;
      }
    }
    const piece = this.add.image(this.trackCursor.x, this.trackCursor.y, type);
    piece.setDisplaySize(this.gridSize, this.gridSize).setDepth(1);
    piece.trackType = type;
    this.roadPieces.push(piece);
    this.worldLayer.add(piece);

    // --- MUDANÇA: Lógica de cursor usando nomes novos ---
    let angle = 0;
    if (this.trackCursor.dir === "UP") {
      if (type === "way_f") {
        this.trackCursor.y -= this.gridSize;
      } else if (type === "way_l") {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      } else {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      } // way_r
    } else if (this.trackCursor.dir === "RIGHT") {
      angle = 90;
      if (type === "way_f") {
        this.trackCursor.x += this.gridSize;
      } else if (type === "way_l") {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      } else {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      } // way_r
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_f") {
        this.trackCursor.x -= this.gridSize;
      } else if (type === "way_l") {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      } else {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      } // way_r
    } else if (this.trackCursor.dir === "DOWN") {
      angle = 180;
      if (type === "way_f") {
        this.trackCursor.y += this.gridSize;
      } else if (type === "way_l") {
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      } else {
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      } // way_r
    }
    piece.setAngle(angle);
  }

  // updateCameraRotation e getPieceUnder permanecem iguais, operam sobre objetos já criados

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
      minDist = this.gridSize * 0.8;
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

  update() {
    const dirs = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
    this.carrier.setVelocity(
      dirs[this.carrierTravelDir][0] * this.speed,
      dirs[this.carrierTravelDir][1] * this.speed,
    );

    if (!this.isFalling) {
      this.player.setPosition(this.carrier.x, this.carrier.y);
    }

    if (this.isGameOver) return;

    const cp = this.getPieceUnder(this.carrier);

    // --- MUDANÇA: Lógica de curva da nave usando nomes novos ---
    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
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
        const req = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
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

        if (this.queuedTurn === req && !this.isManeuvering) {
          this.playerTravelDir = this.carrierTravelDir;
          this.player.setAngle(this.carrier.angle);
          this.queuedTurn = null;
        } else {
          this.triggerFall(req);
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

    if (!this.getPieceUnder(this.carrier)) {
      this.triggerFall(this.playerTravelDir === "LEFT" ? "LEFT" : "RIGHT");
    }
  }

  updateAnimation() {
    if (this.isFalling) return;

    const anims = {
      left: [1, 2],
      right: [3, 4],
      up: [7, 8, 9, 8, 7, 0],
      down: [10, 11, 10, 0],
    };

    if (this.animState === "left" || this.animState === "right") {
      this.currentFrame =
        anims[this.animState][
          this.currentFrame === anims[this.animState][0] ? 1 : 0
        ];
      if (!this.queuedTurn) this.animState = "idle";
    } else if (this.animState === "up") {
      this.currentFrame = anims.up[this.upStep];
      this.upStep++;
      if (this.upStep >= 6) {
        this.animState = "idle";
        this.isManeuvering = false;
      }
    } else if (this.animState === "down") {
      this.currentFrame = anims.down[this.downStep];
      this.downStep++;
      if (this.downStep >= 4) {
        this.animState = "idle";
        this.isManeuvering = false;
      }
    } else {
      this.currentFrame = 0;
    }

    this.player.setFrame(this.currentFrame);
  }
}
