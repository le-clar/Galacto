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

    this.load.image("way_f", "assets/way_f.png");
    this.load.image("way_l", "assets/way_l.png");
    this.load.image("way_r", "assets/way_r.png");

    this.load.image("spaceship_new", "assets/spaceship_new.png");
    this.load.audio("swoosh", "assets/swoosh.mp3");

    this.load.image("aster_1", "assets/aster_1.png");
    this.load.image("aster_2", "assets/aster_2.png");
    this.load.image("aster_3", "assets/aster_3.png");
  }

  create() {
    const { width, height } = this.scale;
    this.worldLayer = this.add.group();

    this.cameras.main.setBackgroundColor(0x080a29);

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 200; i++) {
      graphics.fillCircle(
        Phaser.Math.Between(0, 512),
        Phaser.Math.Between(0, 512),
        Math.random() * 2,
      );
    }
    graphics.generateTexture("starfield", 512, 512);

    const maxDim = Math.max(width, height) * 1.5;
    this.bgStars = this.add
      .tileSprite(width / 2, height / 2, maxDim, maxDim, "starfield")
      .setScrollFactor(0)
      .setDepth(-4);

    this.bg = this.add
      .image(width / 2, height / 2, "logo")
      .setScrollFactor(0)
      .setDepth(-3)
      .setAlpha(0.2);
    this.bg.setScale(
      Math.max(width / this.bg.width, height / this.bg.height) * 1.3,
    );

    this.roadPieces = [];
    this.asteroids = [];

    const texture = this.textures.get("way_f").getSourceImage();
    const roadScale = (width / texture.width) * 0.4;
    this.gridSize = Math.round(texture.height * roadScale);

    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.lastTurnDir = "none";

    this.speed = 250;

    for (let i = 0; i < 20; i++) this.generateTrackPiece();

    this.carrier = this.physics.add.sprite(0, 0, "spaceship_new").setDepth(9);
    const shipScale = (this.gridSize / this.carrier.width) * 0.7;
    this.carrier.setScale(shipScale);

    this.carrierTravelDir = "UP";
    this.carrier.lastTurnedPiece = null;
    this.worldLayer.add(this.carrier);

    this.player = this.physics.add
      .sprite(0, 0, "theo_concept")
      .setScale(3)
      .setDepth(10);
    this.playerTravelDir = "UP";
    this.queuedTurn = null;
    this.worldLayer.add(this.player);

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
    this.uiCam.ignore([this.bg, this.bgStars, this.worldLayer]);

    this.animState = "idle";
    this.currentFrame = 0;
    this.turnStep = 0;

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

  spawnAsteroidNear(x, y) {
    for (let i = 0; i < 5; i++) {
      if (Math.random() > 0.8) continue;

      const types = ["aster_1", "aster_2", "aster_3"];
      const type = Phaser.Math.RND.pick(types);

      const radius = Phaser.Math.Between(
        this.gridSize * 1.5,
        this.gridSize * 6,
      );
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

      const spawnX = x + Math.cos(angle) * radius;
      const spawnY = y + Math.sin(angle) * radius;

      let tooClose = false;
      for (const piece of this.roadPieces) {
        if (
          Phaser.Math.Distance.Between(spawnX, spawnY, piece.x, piece.y) <
          this.gridSize * 0.9
        ) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        const aster = this.add.image(spawnX, spawnY, type);
        aster.setScale(Phaser.Math.FloatBetween(1.5, 3.5));
        aster.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
        aster.setDepth(0);

        aster.rotSpeed = Phaser.Math.FloatBetween(-0.5, 0.5);
        aster.driftX = Phaser.Math.FloatBetween(-15, 15);
        aster.driftY = Phaser.Math.FloatBetween(-15, 15);

        this.asteroids.push(aster);
        this.worldLayer.add(aster);
      }
    }
  }

  getCarrierBaseRotation() {
    if (this.carrierTravelDir === "RIGHT") return Math.PI / 2;
    if (this.carrierTravelDir === "DOWN") return Math.PI;
    if (this.carrierTravelDir === "LEFT") return -Math.PI / 2;
    return 0;
  }

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

    if (currentPiece && currentPiece.trackType === "way_f") {
      this.triggerFall(turnIntent);
      return;
    }

    if (
      currentPiece &&
      (currentPiece.trackType === "way_l" || currentPiece.trackType === "way_r")
    ) {
      const correctDir = currentPiece.trackType === "way_r" ? "RIGHT" : "LEFT";
      if (turnIntent === correctDir) {
        this.queuedTurn = turnIntent;
        this.animState = turnIntent === "RIGHT" ? "right" : "left";
        this.turnStep = 0;

        const tilt = turnIntent === "RIGHT" ? Math.PI / 4 : -Math.PI / 4;
        const targetRad = this.getCarrierBaseRotation() + tilt;
        const currentRad = this.carrier.rotation;

        const diff = Math.atan2(
          Math.sin(targetRad - currentRad),
          Math.cos(targetRad - currentRad),
        );

        const tweenDur = Math.max(80, 150 - (this.speed - 250) * 0.1);
        this.tweens.killTweensOf(this.carrier);
        this.tweens.add({
          targets: this.carrier,
          rotation: currentRad + diff,
          duration: tweenDur,
        });
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

    // --- MUDANÇA: Pontuação para vencer reduzida de 10000 para 5000 ---
    if (this.score >= 5000) {
      this.isGameOver = true;
      this.scene.start("win");
    }
  }

  generateTrackPiece() {
    let type = "way_f";

    let minStraights = 4;
    if (this.speed > 350) minStraights = 3;
    if (this.speed > 450) minStraights = 2;
    if (this.speed > 550) minStraights = 1;

    let curveChance = 0.3 + (this.speed - 250) / 1000;

    if (this.justTurned) {
      type = "way_f";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      if (
        this.straightPiecesCount > minStraights &&
        Math.random() < curveChance
      ) {
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

    this.spawnAsteroidNear(piece.x, piece.y);

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
      }
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
      }
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_f") {
        this.trackCursor.x -= this.gridSize;
      } else if (type === "way_l") {
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y -= this.gridSize;
      } else {
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      }
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
      }
    }
    piece.setAngle(angle);
  }

  updateCameraRotation() {
    let camTargetAngle = 0;
    if (this.carrierTravelDir === "UP") camTargetAngle = 0;
    else if (this.carrierTravelDir === "RIGHT") camTargetAngle = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") camTargetAngle = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") camTargetAngle = Math.PI / 2;

    const currentCamRad = this.cameras.main.rotation;
    let camDiff = Math.atan2(
      Math.sin(camTargetAngle - currentCamRad),
      Math.cos(camTargetAngle - currentCamRad),
    );

    const camDur = Math.max(120, 250 - (this.speed - 250) * 0.2);

    this.tweens.add({
      targets: this.cameras.main,
      rotation: currentCamRad + camDiff,
      duration: camDur,
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
      duration: camDur,
    });

    const carrierTargetRad = this.getCarrierBaseRotation();
    const currentCarrierRad = this.carrier.rotation;
    let carrierDiff = Math.atan2(
      Math.sin(carrierTargetRad - currentCarrierRad),
      Math.cos(carrierTargetRad - currentCarrierRad),
    );

    this.tweens.killTweensOf(this.carrier);
    this.tweens.add({
      targets: this.carrier,
      rotation: currentCarrierRad + carrierDiff,
      duration: camDur,
    });

    const currentPlayerRad = this.player.rotation;
    let playerDiff = Math.atan2(
      Math.sin(carrierTargetRad - currentPlayerRad),
      Math.cos(carrierTargetRad - currentPlayerRad),
    );
    this.tweens.killTweensOf(this.player);
    this.tweens.add({
      targets: this.player,
      rotation: currentPlayerRad + playerDiff,
      duration: camDur,
    });
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

  update(time, delta) {
    const dtSeconds = delta / 1000;

    if (!this.isGameOver && !this.isFalling) {
      this.speed += 5 * dtSeconds;

      if (this.speed > 750) this.speed = 750;
    }

    const dirs = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
    this.carrier.setVelocity(
      dirs[this.carrierTravelDir][0] * this.speed,
      dirs[this.carrierTravelDir][1] * this.speed,
    );

    if (!this.isFalling) {
      this.player.setPosition(this.carrier.x, this.carrier.y);
    }

    this.bgStars.tilePositionX = this.cameras.main.scrollX * 0.05;
    this.bgStars.tilePositionY = this.cameras.main.scrollY * 0.05;

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const aster = this.asteroids[i];

      if (
        Phaser.Math.Distance.Between(
          this.carrier.x,
          this.carrier.y,
          aster.x,
          aster.y,
        ) > 2500
      ) {
        aster.destroy();
        this.asteroids.splice(i, 1);
        continue;
      }

      aster.rotation += aster.rotSpeed * dtSeconds;
      aster.x += aster.driftX * dtSeconds;
      aster.y += aster.driftY * dtSeconds;
    }

    if (this.isGameOver) return;

    const cp = this.getPieceUnder(this.carrier);

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

        this.sound.play("swoosh");
        this.updateCameraRotation();

        if (this.queuedTurn === req && !this.isManeuvering) {
          this.playerTravelDir = this.carrierTravelDir;
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
    ) {
      this.generateTrackPiece();
    }

    if (this.roadPieces.length > 40) this.roadPieces.shift().destroy();

    if (!this.getPieceUnder(this.carrier)) {
      this.triggerFall(this.playerTravelDir === "LEFT" ? "LEFT" : "RIGHT");
    }
  }

  updateAnimation() {
    if (this.animState === "falling_sequence") return;

    const anims = {
      left: [1, 2],
      right: [3, 4],
      up: [7, 8, 9, 8, 7, 0],
      down: [10, 11, 10, 0],
    };

    if (this.animState === "left" || this.animState === "right") {
      const frames = anims[this.animState];
      if (this.turnStep < frames.length) {
        this.currentFrame = frames[this.turnStep];
        this.turnStep++;
      }
      if (!this.queuedTurn) {
        this.animState = "idle";
      }
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
