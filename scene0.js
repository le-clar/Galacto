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

    // Fundo e Mapa
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

    // Configuração da Pista
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

    // PLAYER (Alien)
    this.player = this.physics.add
      .sprite(0, 0, "theo_concept")
      .setScale(3)
      .setDepth(10);
    this.playerTravelDir = "UP";
    this.player.lastTurnedPiece = null;
    this.queuedTurn = null;

    this.speed = 250;
    this.turnCooldown = 0;
    this.isGameOver = false;

    // Câmera segue o ALIEN
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, height * 0.3);

    // Controles
    this.animState = "idle";
    this.currentFrame = 0;
    this.input.on("pointerdown", (pointer) => {
      if (this.isGameOver) return;
      this.startY = pointer.y;
      const isRight = pointer.x > width / 2;
      this.attemptTurn(isRight ? "RIGHT" : "LEFT");
      this.animState = isRight ? "right" : "left";
    });

    this.input.on("pointerup", (pointer) => {
      if (this.isGameOver) return;
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

  attemptTurn(turnIntent) {
    const currentPiece = this.getPieceUnder(this.player);
    if (
      currentPiece &&
      (currentPiece.trackType === "way_left" ||
        currentPiece.trackType === "way_right")
    ) {
      this.queuedTurn = turnIntent;
    } else {
      // Virou na reta! Alien se joga pro lado e cai da nave.
      this.triggerFall(turnIntent, "early");
    }
  }

  triggerFall(direction, type) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Frame 5 = esquerda, Frame 6 = direita
    const fallFrame = direction === "LEFT" ? 5 : 6;
    this.player.setFrame(fallFrame);

    // FÍSICA DE SEPARAÇÃO: Desgruda o alien da nave
    if (type === "early") {
      // Se tentou virar na reta, ele pula pro lado (mantendo o impulso para frente)
      let vx = 0,
        vy = 0;
      if (this.playerTravelDir === "UP") {
        vx = direction === "LEFT" ? -this.speed : this.speed;
        vy = -this.speed;
      } else if (this.playerTravelDir === "DOWN") {
        vx = direction === "LEFT" ? this.speed : -this.speed;
        vy = this.speed;
      } else if (this.playerTravelDir === "RIGHT") {
        vy = direction === "LEFT" ? -this.speed : this.speed;
        vx = this.speed;
      } else if (this.playerTravelDir === "LEFT") {
        vy = direction === "LEFT" ? this.speed : -this.speed;
        vx = -this.speed;
      }

      this.player.setVelocity(vx, vy);
    } else {
      // Se passou direto da curva ("missed"), ele só continua reto com a velocidade que já tinha
      let vx = 0,
        vy = 0;
      if (this.playerTravelDir === "UP") vy = -this.speed;
      else if (this.playerTravelDir === "DOWN") vy = this.speed;
      else if (this.playerTravelDir === "RIGHT") vx = this.speed;
      else if (this.playerTravelDir === "LEFT") vx = -this.speed;

      this.player.setVelocity(vx, vy);
    }

    // Dá 1 segundo pra você ver ele voar pelo espaço pra fora da tela, e reinicia
    this.time.delayedCall(1000, () => {
      this.scene.restart();
    });
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
      ease: "Sine.easeInOut",
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
      // Funcionamento normal: os dois andam juntos
      this.carrier.setVelocity(
        dirs[this.carrierTravelDir][0] * this.speed,
        dirs[this.carrierTravelDir][1] * this.speed,
      );
      this.player.setVelocity(
        dirs[this.playerTravelDir][0] * this.speed,
        dirs[this.playerTravelDir][1] * this.speed,
      );
    } else {
      // GAME OVER: A nave continua seu caminho, mas o alien fica livre voando para o espaço com a física do triggerFall!
      this.carrier.setVelocity(
        dirs[this.carrierTravelDir][0] * this.speed,
        dirs[this.carrierTravelDir][1] * this.speed,
      );
      return; // Interrompe o resto da lógica para ele não tentar seguir curvas
    }

    // Lógica de Curva da Nave
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

        // Nave vira
        const nextDirs = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        };
        this.carrierTravelDir = nextDirs[this.carrierTravelDir][req];
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.updateCameraRotation();

        // Alien acompanha ou toma Game Over
        if (this.queuedTurn === req) {
          this.playerTravelDir = this.carrierTravelDir;
          this.player.setPosition(this.carrier.x, this.carrier.y);
          this.player.setAngle(this.carrier.angle);
          this.queuedTurn = null;
          this.turnCooldown = 300;
        } else {
          // Nave virou, alien passou reto. Saiu de cima da nave!
          this.triggerFall(req, "missed");
        }
      }
    }

    // Gerador infinito
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
    if (this.turnCooldown > 0) this.turnCooldown -= delta;

    // Fallback: caiu da estrada
    if (!this.getPieceUnder(this.player)) {
      this.triggerFall(
        this.playerTravelDir === "LEFT" ? "LEFT" : "RIGHT",
        "missed",
      );
    }
  }

  updateAnimation() {
    if (this.isGameOver) return; // Congela o sprite no frame de queda

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
    } else if (this.animState === "up" || this.animState === "down") {
      this.currentFrame =
        anims[this.animState][this.upStep || this.downStep || 0];
      if (this.animState === "up") {
        this.upStep++;
        if (this.upStep >= 6) this.animState = "idle";
      } else {
        this.downStep++;
        if (this.downStep >= 4) this.animState = "idle";
      }
    } else if (this.animState === "returning") {
      this.currentFrame = 0;
      this.animState = "idle";
    }
    this.player.setFrame(this.currentFrame);
  }
}
