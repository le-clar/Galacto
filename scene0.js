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

    // Peças da Pista
    this.load.image("way_0", "assets/way_0.png");
    this.load.image("way_left", "assets/way_left.png");
    this.load.image("way_right", "assets/way_right.png");

    // Carrinho/Nave que segue a pista
    this.load.spritesheet("spaceship", "assets/spaceship.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.image("celestial-objects", "assets/celestial-objects.png");
  }

  create() {
    const { width, height } = this.scale;

    // =====================
    // FUNDO INFINITO
    // =====================
    this.bg = this.add.image(width / 2, height / 2, "logo");
    const bgScale =
      Math.max(width / this.bg.width, height / this.bg.height) * 1.3;
    this.bg.setScale(bgScale);
    this.bg.setScrollFactor(0); // Faz o fundo acompanhar a câmera
    this.bg.setDepth(-3);

    // =====================
    // MAPA (Parallax)
    // =====================
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage(
      "celestial-objects",
      "celestial-objects",
    );
    this.mapLayer = map.createLayer("elementos", tileset, -width, -height);
    this.mapLayer.setDepth(-1);
    this.mapLayer.setScrollFactor(0.2);
    this.mapLayer.setScale(2);

    // =====================
    // GERADOR DE PISTA
    // =====================
    this.roadPieces = [];
    const texture = this.textures.get("way_0").getSourceImage();
    const roadScale = (width / texture.width) * 0.25;

    this.gridSize = Math.round(texture.height * roadScale);

    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.lastTurnDir = "none"; // Evita que a pista dê a volta e se cruze

    // Gera as primeiras 20 peças de pista
    for (let i = 0; i < 20; i++) {
      this.generateTrackPiece();
    }

    // =====================
    // CARRIER (Nave que segue a pista)
    // =====================
    // Usamos Física Arcade no Carrier para velocidade e colisão
    this.carrier = this.physics.add.sprite(0, 0, "spaceship");
    this.carrier.setOrigin(0.5, 0.5);
    this.carrier.setScale(3);
    this.carrier.setFrame(0);
    this.carrier.setDepth(9); // Abaixo do jogador

    this.carrierTravelDir = "UP";
    this.speed = 250;
    this.turnCooldown = 0;

    // Cria as animações de giro do carrinho
    this.anims.create({
      key: "turn_right",
      frames: this.anims.generateFrameNumbers("spaceship", {
        start: 1,
        end: 2,
      }),
      frameRate: 10,
      repeat: 0,
    });
    this.anims.create({
      key: "turn_left",
      frames: this.anims.generateFrameNumbers("spaceship", {
        start: 3,
        end: 4,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // =====================
    // PLAYER (Théo)
    // =====================
    // Théo é apenas um sprite visual que segue o Carrier
    this.player = this.add.sprite(0, 0, "theo_concept");
    this.player.setOrigin(0.5, 0.5);
    this.player.setScale(3);
    this.player.setFrame(0);
    this.player.setDepth(10); // Acima do carrinho

    // =====================
    // CÂMERA
    // =====================
    // Câmera segue o Carrier
    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, height * 0.3);

    // =====================
    // CONTROLE DE MANOBRAS E CURVAS
    // =====================
    this.animState = "idle";
    this.currentFrame = 0;
    this.startY = 0;

    this.input.on("pointerdown", (pointer) => {
      this.startY = pointer.y;

      const isRightClick = pointer.x > width / 2;

      if (this.turnCooldown <= 0) {
        this.attemptTurn(isRightClick ? "RIGHT" : "LEFT");
      }

      this.animState = isRightClick ? "right" : "left";
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

  // =====================
  // LÓGICA DE GERAÇÃO 90 GRAUS
  // =====================
  generateTrackPiece() {
    let type = "way_0";

    if (this.justTurned) {
      type = "way_0";
      this.justTurned = false;
      this.straightPiecesCount = 1;
    } else {
      this.straightPiecesCount++;
      // Gera curva após 4 retas e força um Zigue-Zague para a pista nunca se cruzar
      if (this.straightPiecesCount > 4 && Math.random() < 0.3) {
        if (this.lastTurnDir === "none") {
          type = Math.random() < 0.5 ? "way_left" : "way_right";
          this.lastTurnDir = type === "way_left" ? "left" : "right";
        } else if (this.lastTurnDir === "left") {
          type = "way_right";
          this.lastTurnDir = "right";
        } else {
          type = "way_left";
          this.lastTurnDir = "left";
        }
        this.justTurned = true;
      }
    }

    let angle = 0;
    const px = this.trackCursor.x;
    const py = this.trackCursor.y;

    const piece = this.add.image(px, py, type);
    piece.setDisplaySize(this.gridSize, this.gridSize);
    piece.setDepth(1);
    piece.trackType = type;

    this.roadPieces.push(piece);

    // Ajusta o cursor para a PRÓXIMA peça
    if (this.trackCursor.dir === "UP") {
      if (type === "way_0") {
        angle = 0;
        this.trackCursor.y -= this.gridSize;
      } else if (type === "way_left") {
        angle = 0;
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      } else if (type === "way_right") {
        angle = 0;
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      }
    } else if (this.trackCursor.dir === "RIGHT") {
      if (type === "way_0") {
        angle = 90;
        this.trackCursor.x += this.gridSize;
      } else if (type === "way_left") {
        angle = 90;
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      } else if (type === "way_right") {
        angle = 90;
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      }
    } else if (this.trackCursor.dir === "LEFT") {
      if (type === "way_0") {
        angle = -90;
        this.trackCursor.x -= this.gridSize;
      } else if (type === "way_left") {
        angle = -90;
        this.trackCursor.dir = "DOWN";
        this.trackCursor.y += this.gridSize;
      } else if (type === "way_right") {
        angle = -90;
        this.trackCursor.dir = "UP";
        this.trackCursor.y -= this.gridSize;
      }
    } else if (this.trackCursor.dir === "DOWN") {
      if (type === "way_0") {
        angle = 180;
        this.trackCursor.y += this.gridSize;
      } else if (type === "way_left") {
        angle = 180;
        this.trackCursor.dir = "RIGHT";
        this.trackCursor.x += this.gridSize;
      } else if (type === "way_right") {
        angle = 180;
        this.trackCursor.dir = "LEFT";
        this.trackCursor.x -= this.gridSize;
      }
    }

    piece.setAngle(angle);
  }

  attemptTurn(turnIntent) {
    const currentPiece = this.getPieceUnderPlayer();

    if (
      currentPiece &&
      (currentPiece.trackType === "way_left" ||
        currentPiece.trackType === "way_right")
    ) {
      let validTurn = false;
      if (currentPiece.trackType === "way_right" && turnIntent === "RIGHT")
        validTurn = true;
      if (currentPiece.trackType === "way_left" && turnIntent === "LEFT")
        validTurn = true;

      if (validTurn) {
        // Atualiza a direção do Carrier
        if (this.carrierTravelDir === "UP")
          this.carrierTravelDir = turnIntent === "RIGHT" ? "RIGHT" : "LEFT";
        else if (this.carrierTravelDir === "RIGHT")
          this.carrierTravelDir = turnIntent === "RIGHT" ? "DOWN" : "UP";
        else if (this.carrierTravelDir === "LEFT")
          this.carrierTravelDir = turnIntent === "RIGHT" ? "UP" : "DOWN";
        else if (this.carrierTravelDir === "DOWN")
          this.carrierTravelDir = turnIntent === "RIGHT" ? "LEFT" : "RIGHT";

        // Crava o Carrier no centro da curva
        this.carrier.x = currentPiece.x;
        this.carrier.y = currentPiece.y;

        // Inicia a animação de giro do Carrier
        if (turnIntent === "RIGHT") this.carrier.play("turn_right");
        else this.carrier.play("turn_left");

        this.turnCooldown = 300;
        this.updateCameraRotation();
      }
    }
  }

  // =====================
  // ROTAÇÃO DE CÂMERA (CORRIGIDA)
  // =====================
  updateCameraRotation() {
    let targetAngle = 0;
    if (this.carrierTravelDir === "UP") targetAngle = 0;
    else if (this.carrierTravelDir === "RIGHT") targetAngle = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetAngle = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetAngle = Math.PI / 2;

    const currentRad = this.cameras.main.rotation;

    let diff = targetAngle - currentRad;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const finalRotation = currentRad + diff;

    // Gira a câmera suavemente
    this.tweens.add({
      targets: this.cameras.main,
      rotation: finalRotation,
      duration: 250,
      ease: "Sine.easeInOut",
      // Callback: Quando a câmera termina de girar...
      onComplete: () => {
        this.carrier.setFrame(0); // Carrinho volta para o frame 0 (reto)
      },
    });

    // Ajusta o offset da câmera
    let offsetX = 0,
      offsetY = 0;
    const offsetDist = this.scale.height * 0.3;

    if (this.carrierTravelDir === "UP") offsetY = offsetDist;
    else if (this.carrierTravelDir === "RIGHT") offsetX = -offsetDist;
    else if (this.carrierTravelDir === "DOWN") offsetY = -offsetDist;
    else if (this.carrierTravelDir === "LEFT") offsetX = offsetDist;

    this.tweens.add({
      targets: this.cameras.main.followOffset,
      x: offsetX,
      y: offsetY,
      duration: 250,
      ease: "Sine.easeInOut",
    });

    // Gira os sprites visualmente
    let playerAngle = 0;
    if (this.carrierTravelDir === "RIGHT") playerAngle = 90;
    if (this.carrierTravelDir === "DOWN") playerAngle = 180;
    if (this.carrierTravelDir === "LEFT") playerAngle = -90;

    this.carrier.setAngle(playerAngle);
    this.player.setAngle(playerAngle);
  }

  getPieceUnderPlayer() {
    let closest = null;
    let minDist = this.gridSize;

    for (const piece of this.roadPieces) {
      const d = Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
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
    // 1. Movimentação do Carrier (Segue a pista)
    if (this.carrierTravelDir === "UP")
      this.carrier.setVelocity(0, -this.speed);
    else if (this.carrierTravelDir === "RIGHT")
      this.carrier.setVelocity(this.speed, 0);
    else if (this.carrierTravelDir === "LEFT")
      this.carrier.setVelocity(-this.speed, 0);
    else if (this.carrierTravelDir === "DOWN")
      this.carrier.setVelocity(0, this.speed);

    // 2. Sincroniza o Player visualmente com o Carrier
    // O Théo segue X e Y do carrinho perfeitamente (independente do input lateral que adicionaremos depois)
    this.player.x = this.carrier.x;
    this.player.y = this.carrier.y;

    // 3. Geração Infinita (Baseada no Carrier)
    const headPiece = this.roadPieces[this.roadPieces.length - 1];
    if (headPiece) {
      const dist = Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        headPiece.x,
        headPiece.y,
      );
      if (dist < 1500) {
        this.generateTrackPiece();
      }
    }

    if (this.roadPieces.length > 40) {
      const oldPiece = this.roadPieces.shift();
      oldPiece.destroy();
    }

    if (this.turnCooldown > 0) {
      this.turnCooldown -= delta;
    }

    // 4. Verificação de Derrota (Baseada no Carrier)
    const currentPiece = this.getPieceUnderPlayer();
    if (!currentPiece) {
      console.log("Caiu da Via Láctea!");
      this.scene.restart();
    }
  }

  // Mantive sua lógica exata de animação do Théo!
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
