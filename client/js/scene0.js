export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  create() {
    const { width, height } = this.scale;

    // A shared group for everything that scrolls with the level.
    this.worldLayer = this.add.group();

    // Deterministic random seed per room so track generation is consistent.
    this.random = new Phaser.Math.RandomDataGenerator([
      this.game.room || "default",
    ]);

    this.cameras.main.setBackgroundColor(0x080a29);

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 200; i++) {
      graphics.fillCircle(
        this.random.integerInRange(0, 512),
        this.random.integerInRange(0, 512),
        this.random.realInRange(0, 2),
      );
    }
    graphics.generateTexture("starfield", 512, 512);

    const bgSize = Math.max(width, height) * 8;

    this.bgStars = this.add
      .tileSprite(width / 2, height / 2, bgSize, bgSize, "starfield")
      .setScrollFactor(0)
      .setDepth(-4);

    this.roadPieces = [];
    this.asteroids = [];

    const texture = this.textures.get("way_f").getSourceImage();
    const roadScale = (width / texture.width) * 0.4;
    this.gridSize = Math.round(texture.height * roadScale);

    this.trackCursor = { x: 0, y: 0, dir: "UP" };
    this.straightPiecesCount = 0;
    this.justTurned = false;
    this.turnHistory = 0;

    this.piecesSinceLastWindow = 0;
    this.piecesSinceLastTrickWindow = 0;
    this.forcedStraightRemaining = 0;
    this.initialStraightRemaining = 12;

    this.isInfiniteMode = !!this.game.isInfiniteMode;

    // --- SISTEMA DE TUTORIAL (História apenas, primeira vez) ---
    // Não mostra tutorial no modo infinito e não repete se já foi visto.
    const tutorialDone = localStorage.getItem("galacto_tutorial_done");
    this.tutorialActive = !this.isInfiniteMode && !tutorialDone;

    if (this.tutorialActive) {
      this.tutorialStep = 0;
      this.tutorialTimer = 0;
      this.totalPiecesGenerated = 0;
    }

    this.speed = 550;
    this.timeElapsed = 0;
    this.isGameOver = false;
    this.score = 0;

    // Tempo de jogo aumentado para exatamente 2 minutos (120s)
    this.maxTime = this.isInfiniteMode ? Infinity : 120;
    this.targetScore = this.isInfiniteMode ? null : 3000;

    this.isDoingTrick = false;
    this.trickCooldown = false;

    this.bgMusic = this.sound.add("soundtrack", { loop: true, volume: 0.5 });
    this.bgMusic.play();

    // Gera o mapa inicial
    for (let i = 0; i < 80; i++) this.generateTrackPiece();

    this.carrier = this.physics.add.sprite(0, 0, "spaceship_new").setDepth(9);
    this.carrier.setScale((this.gridSize / this.carrier.width) * 0.6);
    this.carrierTravelDir = "UP";
    this.carrier.lastTurnedPiece = null;
    this.worldLayer.add(this.carrier);

    this.player = this.physics.add
      .sprite(0, 0, "player")
      .setDepth(10)
      .setScale(3);
    this.player.setFrame(0);
    this.worldLayer.add(this.player);

    this.playerLeanAngle = 0;
    this.leanDirection = "NONE";
    this.leanSpeed = 190;

    this.timeText = this.add
      .text(
        30,
        30,
        this.isInfiniteMode ? `Tempo: 0s` : `Tempo: ${this.maxTime}s`,
        {
          fontSize: "29px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setDepth(100)
      .setScrollFactor(0);

    this.scoreText = this.add
      .text(
        30,
        70,
        this.isInfiniteMode ? `Pontos: 0` : `Pontos: 0 / ${this.targetScore}`,
        {
          fontSize: "24px",
          fill: "#ffff00",
          fontFamily: "MinhaFontePersonalizada",
        },
      )
      .setDepth(100)
      .setScrollFactor(0);

    const ignoreList = [this.timeText, this.scoreText];

    if (this.tutorialActive) {
      this.tutorialText = this.add
        .text(width - 30, 50, "Pressione a direita para virar a curva", {
          fontSize: "22px",
          fill: "#00ff00",
          fontFamily: "MinhaFontePersonalizada",
          align: "left",
          wordWrap: { width: 260, useAdvancedWrap: true },
          backgroundColor: "#000000cc",
          padding: { x: 14, y: 14 },
        })
        .setOrigin(1, 0)
        .setDepth(100)
        .setScrollFactor(0);
      ignoreList.push(this.tutorialText);
    }

    this.cameras.main.ignore(ignoreList);
    this.cameras.main.startFollow(this.carrier, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.4);
    this.cameras.main.setFollowOffset(0, height * 1.0);

    this.uiCam = this.cameras.add(0, 0, width, height);
    this.uiCam.ignore([this.bgStars, this.worldLayer]);

    this.pointerGesture = { downX: 0, downY: 0, downTime: 0, moved: false };

    this.handlePointerDown = (pointer) => {
      if (this.isGameOver || this.game.isSpectator) return;
      this.pointerGesture.downX = pointer.x;
      this.pointerGesture.downY = pointer.y;
      this.pointerGesture.downTime = performance.now();
    };

    this.handlePointerUp = (pointer) => {
      if (this.isGameOver || this.game.isSpectator) return;
      const dx = pointer.x - this.pointerGesture.downX;
      const dy = pointer.y - this.pointerGesture.downY;
      if (
        this.pointerGesture.downY - pointer.y > 60 &&
        Math.abs(dy) > Math.abs(dx)
      ) {
        this.startTrick();
      } else {
        const turn = pointer.x > width / 2 ? "RIGHT" : "LEFT";
        this.attemptTurn(turn);
      }
    };

    this.handleTurnLeft = () => this.attemptTurn("LEFT");
    this.handleTurnRight = () => this.attemptTurn("RIGHT");
    this.handleStartTrick = () => this.startTrick();

    this.input.on("pointerdown", this.handlePointerDown);
    this.input.on("pointerup", this.handlePointerUp);
    this.input.keyboard.on("keydown-A", this.handleTurnLeft);
    this.input.keyboard.on("keydown-D", this.handleTurnRight);
    this.input.keyboard.on("keydown-W", this.handleStartTrick);

    this.events.once("shutdown", () => this.cleanup());

    // Socket: for spectators, receive remote state updates
    if (this.game.socket && this.game.isSpectator) {
      this.game.socket.on("scene0", (state) => {
        if (state && typeof state === "object") {
          if (typeof state.score === "number") {
            this.score = state.score;
            this.scoreText.setText(
              this.isInfiniteMode
                ? `Pontos: ${this.score}`
                : `Pontos: ${this.score} / ${this.targetScore}`,
            );
          }
          if (typeof state.time === "number") {
            this.timeElapsed = state.time;
            this.timeText.setText(
              this.isInfiniteMode
                ? `Tempo: ${Math.ceil(this.timeElapsed)}s`
                : `Tempo: ${this.maxTime}s`,
            );
          }
          // Apply player/carrier positions for smoother spectating
          try {
            if (state.player) {
              if (typeof state.player.x === "number")
                this.player.x = state.player.x;
              if (typeof state.player.y === "number")
                this.player.y = state.player.y;
              if (typeof state.player.angle === "number")
                this.player.angle = state.player.angle;
              if (typeof state.player.frame !== "undefined")
                this.player.setFrame(state.player.frame);
            }
            if (state.carrier) {
              if (typeof state.carrier.x === "number")
                this.carrier.x = state.carrier.x;
              if (typeof state.carrier.y === "number")
                this.carrier.y = state.carrier.y;
              if (typeof state.carrier.rotation === "number")
                this.carrier.rotation = state.carrier.rotation;
            }
          } catch (e) {
            // ignore any sync errors
          }
        }
      });
      this.game.socket.on("game-ended", () => {
        if (this.game.isSpectator) {
          // Spectator: leave view when match ends and return to menu.
          this.game.isSpectator = false;
          this.cleanup();
          this.scene.start("menu");
        }
      });
    }

    // If player is the host of an infinite match, periodically send reduced state updates to server
    this._infiniteUpdateEvent = null;
    if (
      this.game.socket &&
      this.isInfiniteMode &&
      !this.game.isSpectator &&
      this.game.room
    ) {
      this._infiniteUpdateEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: this.sendInfiniteStateUpdate,
        callbackScope: this,
      });
    }
  }

  cleanup() {
    if (this.input) {
      if (this.handlePointerDown)
        this.input.off("pointerdown", this.handlePointerDown);
      if (this.handlePointerUp)
        this.input.off("pointerup", this.handlePointerUp);
      if (this.input.keyboard) {
        if (this.handleTurnLeft)
          this.input.keyboard.off("keydown-A", this.handleTurnLeft);
        if (this.handleTurnRight)
          this.input.keyboard.off("keydown-D", this.handleTurnRight);
        if (this.handleStartTrick)
          this.input.keyboard.off("keydown-W", this.handleStartTrick);
      }
    }
    this.handlePointerDown = null;
    this.handlePointerUp = null;
    this.handleTurnLeft = null;
    this.handleTurnRight = null;
    this.handleStartTrick = null;

    if (this.roadPieces && this.roadPieces.length) {
      for (const piece of this.roadPieces) {
        this.destroyAsteroidsForPiece(piece);
      }
    }
    if (this.asteroids && this.asteroids.length) {
      for (const aster of this.asteroids) {
        if (aster && aster.active) aster.destroy();
      }
      this.asteroids.length = 0;
    }

    if (this.game.socket) {
      // Remove socket listeners added during this scene to prevent duplicates.
      this.game.socket.off("scene0");
      this.game.socket.off("game-ended");
      if (this.game.room) {
        this.game.socket.emit("leave-room", this.game.room);
        this.game.room = null;
      }
    }
    if (this.bgMusic) this.bgMusic.stop();
    if (this._infiniteUpdateEvent) {
      this._infiniteUpdateEvent.remove(false);
      this._infiniteUpdateEvent = null;
    }
  }

  sendInfiniteStateUpdate() {
    if (
      !this.game.socket ||
      !this.isInfiniteMode ||
      this.game.isSpectator ||
      !this.game.room
    ) {
      return;
    }

    try {
      const state = {
        score: this.score,
        time: Math.ceil(this.timeElapsed),
        player: {
          x: this.player.x,
          y: this.player.y,
          angle: this.player.angle,
          frame: this.player.frame
            ? this.player.frame.name || this.player.frame
            : undefined,
        },
        carrier: {
          x: this.carrier.x,
          y: this.carrier.y,
          rotation: this.carrier.rotation,
        },
      };
      this.game.socket.emit("update-infinite", this.game.room, state);
    } catch (e) {
      // ignore
    }
  }

  // End the current gameplay session and switch to a different scene.
  endGame(sceneKey) {
    if (!this.game.isSpectator && this.game.socket && this.game.room) {
      this.game.socket.emit("change-scene", this.game.room, sceneKey);
    }
    this.game.isSpectator = false;
    this.cleanup();
    this.scene.start(sceneKey);
  }

  // Check upcoming pieces to decide whether a curve appears soon.
  isCurveUpcoming(lookAheadCount = 5) {
    const currentPiece = this.getPieceUnder(this.carrier);
    if (!currentPiece) return null;
    const index = this.roadPieces.indexOf(currentPiece);
    if (index === -1) return null;

    // Varre as próximas peças reais da fila de renderização
    for (let i = 1; i <= lookAheadCount; i++) {
      const nextPiece = this.roadPieces[index + i];
      if (nextPiece && nextPiece.trackType !== "way_f") {
        return nextPiece.trackType; // Retorna 'way_r' ou 'way_l'
      }
    }
    return null;
  }

  // Begin a special trick move when the player swipes up.
  startTrick() {
    const curveAhead = !!this.isCurveUpcoming(5);

    if (
      this.isGameOver ||
      this.isDoingTrick ||
      this.trickCooldown ||
      this.leanDirection !== "NONE" ||
      curveAhead ||
      (this.tutorialActive && this.tutorialStep < 2)
    )
      return;

    this.isDoingTrick = true;
    this.trickCooldown = true;
    this.sound.play("swoosh");

    this.forcedStraightRemaining += 6;

    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + 360,
      duration: 1100,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (this.isGameOver) return;
        this.sound.play("trick");
        this.isDoingTrick = false;

        this.score += 200;
        this.scoreText.setText(
          this.isInfiniteMode
            ? `Pontos: ${this.score}`
            : `Pontos: ${this.score} / ${this.targetScore}`,
        );

        this.time.delayedCall(1400, () => {
          this.trickCooldown = false;
        });
      },
    });
  }

  // Smoothly rotate the camera to align with the track direction.
  updateCameraRotation() {
    let targetCamRad = 0;
    if (this.carrierTravelDir === "UP") targetCamRad = 0;
    else if (this.carrierTravelDir === "RIGHT") targetCamRad = -Math.PI / 2;
    else if (this.carrierTravelDir === "DOWN") targetCamRad = -Math.PI;
    else if (this.carrierTravelDir === "LEFT") targetCamRad = Math.PI / 2;

    const camDur = 250;
    const currentCamRad = this.cameras.main.rotation;
    let camDiff = Math.atan2(
      Math.sin(targetCamRad - currentCamRad),
      Math.cos(targetCamRad - currentCamRad),
    );

    this.tweens.add({
      targets: this.cameras.main,
      rotation: currentCamRad + camDiff,
      duration: camDur,
    });

    let dist = this.scale.height * 1.0;
    let offX = 0,
      offY = 0;
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

    let shipTargetRad =
      this.carrierTravelDir === "DOWN"
        ? Math.PI
        : targetCamRad === 0
          ? 0
          : -targetCamRad;
    const currentShipRad = this.carrier.rotation;

    // Correção: Math.sin() e Math.cos() normais evitam a inversão nas curvas à esquerda!
    let shipDiff = Math.atan2(
      Math.sin(shipTargetRad - currentShipRad),
      Math.cos(shipTargetRad - currentShipRad),
    );
    this.tweens.add({
      targets: this.carrier,
      rotation: currentShipRad + shipDiff,
      duration: camDur,
    });
  }

  // Spawn decorative asteroids near the current track piece.
  spawnAsteroidNear(x, y, parentPiece = null) {
    const created = [];
    for (let i = 0; i < 4; i++) {
      if (this.random.frac() > 0.7) continue;
      const type = this.random.pick(["aster_1", "aster_2", "aster_3"]);
      const aster = this.add.image(
        x + this.random.integerInRange(-500, 500),
        y + this.random.integerInRange(-500, 500),
        type,
      );
      aster
        .setScale(this.random.realInRange(1.5, 3.5))
        .setRotation(this.random.realInRange(0, Math.PI * 2))
        .setDepth(0);
      aster.rotSpeed = this.random.realInRange(-0.5, 0.5);
      aster.driftX = this.random.realInRange(-10, 10);
      aster.driftY = this.random.realInRange(-10, 10);
      if (parentPiece) aster.parentPiece = parentPiece;
      this.asteroids.push(aster);
      created.push(aster);
      this.worldLayer.add(aster);
    }
    return created;
  }

  destroyAsteroidsForPiece(piece) {
    if (
      !piece ||
      !piece.spawnedAsteroids ||
      piece.spawnedAsteroids.length === 0
    )
      return;
    for (const asteroid of piece.spawnedAsteroids) {
      if (asteroid && asteroid.active) asteroid.destroy();
      const index = this.asteroids.indexOf(asteroid);
      if (index !== -1) this.asteroids.splice(index, 1);
    }
    piece.spawnedAsteroids.length = 0;
  }

  // Handle a failed turn or incorrect lean by triggering a fall animation.
  triggerFall() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    const fallSide =
      this.playerLeanAngle !== 0
        ? this.playerLeanAngle > 0
          ? 1
          : -1
        : this.random.frac() > 0.5
          ? 1
          : -1;
    this.player.setFrame(2);
    this.tweens.add({
      targets: this.player,
      angle: this.player.angle + fallSide * 180,
      duration: 1200,
    });
    this.tweens.add({ targets: this.bgMusic, volume: 0, duration: 1200 });
    this.time.delayedCall(1200, () => {
      if (this.isInfiniteMode) {
        this.game.lastInfiniteResult = {
          score: this.score,
          time: Math.ceil(this.timeElapsed),
        };
        // Notify server that this infinite match ended before cleanup removes the room.
        if (this.game.socket && this.game.room) {
          this.game.socket.emit("end-infinite", this.game.room);
        }
        this.endGame("menu");
      } else {
        this.endGame("gameover");
      }
    });
  }

  // Attempt to steer the player left or right based on input.
  attemptTurn(turnIntent) {
    if (this.isGameOver || this.isDoingTrick) return;

    const cp = this.getPieceUnder(this.carrier);
    if (
      cp &&
      cp.trackType === "way_f" &&
      !this.tutorialActive &&
      !this.game.isSpectator
    ) {
      const upcoming = this.isCurveUpcoming(4);
      const correctLeaning =
        (upcoming === "way_r" && turnIntent === "RIGHT") ||
        (upcoming === "way_l" && turnIntent === "LEFT");
      if (!correctLeaning) {
        this.triggerFall();
        return;
      }
    }

    this.leanDirection = turnIntent;
  }

  // Generate a new track tile and advance the track cursor.
  generateTrackPiece() {
    let type = "way_f";

    if (this.initialStraightRemaining > 0) {
      type = "way_f";
      this.initialStraightRemaining--;
      this.straightPiecesCount++;
      this.piecesSinceLastWindow++;
      this.piecesSinceLastTrickWindow++;
    } else if (this.tutorialActive && this.totalPiecesGenerated < 50) {
      if (this.totalPiecesGenerated === 15) type = "way_r";
      else if (this.totalPiecesGenerated === 30) type = "way_l";
      else type = "way_f";
      this.totalPiecesGenerated++;
    } else if (this.forcedStraightRemaining > 0) {
      this.forcedStraightRemaining--;
      this.straightPiecesCount++;
      this.piecesSinceLastWindow++;
      type = "way_f";
      if (this.forcedStraightRemaining === 0) this.justTurned = true;
    } else {
      const ensureTrickWindow = this.piecesSinceLastTrickWindow >= 10;
      this.straightPiecesCount++;
      this.piecesSinceLastWindow++;
      this.piecesSinceLastTrickWindow++;

      const mustCurve =
        this.straightPiecesCount >= 4 || this.piecesSinceLastWindow >= 8;
      const randomCurve =
        this.straightPiecesCount > 1 && this.random.frac() < 0.55;

      if (ensureTrickWindow) {
        this.forcedStraightRemaining = Math.max(
          this.forcedStraightRemaining,
          5,
        );
        this.piecesSinceLastTrickWindow = 0;
        type = "way_f";
      } else if (mustCurve || randomCurve) {
        type =
          this.turnHistory > 0
            ? "way_l"
            : this.turnHistory < 0
              ? "way_r"
              : this.random.frac() < 0.5
                ? "way_l"
                : "way_r";
        this.turnHistory += type === "way_r" ? 1 : -1;
        this.justTurned = true;
        this.piecesSinceLastWindow = 0;
        this.straightPiecesCount = 0;
      } else {
        type = "way_f";
      }
    }

    const piece = this.add
      .image(this.trackCursor.x, this.trackCursor.y, type)
      .setDisplaySize(this.gridSize, this.gridSize)
      .setDepth(1);
    piece.trackType = type;
    this.roadPieces.push(piece);
    this.worldLayer.add(piece);
    piece.spawnedAsteroids = this.spawnAsteroidNear(piece.x, piece.y, piece);

    let angle = 0;
    if (this.trackCursor.dir === "UP") {
      if (type === "way_f") this.trackCursor.y -= this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "LEFT" : "RIGHT";
        this.trackCursor.x += type === "way_l" ? -this.gridSize : this.gridSize;
      }
    } else if (this.trackCursor.dir === "RIGHT") {
      angle = 90;
      if (type === "way_f") this.trackCursor.x += this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "UP" : "DOWN";
        this.trackCursor.y += type === "way_l" ? -this.gridSize : this.gridSize;
      }
    } else if (this.trackCursor.dir === "LEFT") {
      angle = -90;
      if (type === "way_f") this.trackCursor.x -= this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "DOWN" : "UP";
        this.trackCursor.y += type === "way_l" ? this.gridSize : -this.gridSize;
      }
    } else if (this.trackCursor.dir === "DOWN") {
      angle = 180;
      if (type === "way_f") this.trackCursor.y += this.gridSize;
      else {
        this.trackCursor.dir = type === "way_l" ? "RIGHT" : "LEFT";
        this.trackCursor.x += type === "way_l" ? this.gridSize : -this.gridSize;
      }
    }
    piece.setAngle(angle);
  }

  // Main game loop: update timers, physics, input response, and track generation.
  update(time, delta) {
    const dtSeconds = delta / 1000;

    if (!this.isGameOver) {
      if (this.tutorialActive) {
        if (this.tutorialStep === 0) {
          if (
            this.carrier.lastTurnedPiece &&
            this.carrier.lastTurnedPiece.trackType === "way_r"
          ) {
            this.tutorialStep = 1;
            this.tutorialText.setText(
              "Pressione a esquerda para virar a curva",
            );
          }
        } else if (this.tutorialStep === 1) {
          if (
            this.carrier.lastTurnedPiece &&
            this.carrier.lastTurnedPiece.trackType === "way_l"
          ) {
            this.tutorialStep = 2;
            this.tutorialText.setText(
              "Arraste para cima para fazer uma manobra",
            );
            this.tutorialTimer = 5;
          }
        } else if (this.tutorialStep === 2) {
          this.tutorialTimer -= dtSeconds;
          if (this.tutorialTimer <= 0 || this.isDoingTrick) {
            this.tutorialActive = false;
            if (this.tutorialText) this.tutorialText.destroy();
            localStorage.setItem("galacto_tutorial_done", "true");
          }
        }
      }

      if (!this.game.isSpectator && !this.tutorialActive) {
        this.timeElapsed += dtSeconds;
        this.speed = Math.min(1200, 550 + 650 * (this.timeElapsed / 20));

        const timeLeft = Math.max(0, this.maxTime - this.timeElapsed);
        this.timeText.setText(
          this.isInfiniteMode
            ? `Tempo: ${Math.ceil(this.timeElapsed)}s`
            : `Tempo: ${Math.ceil(timeLeft)}s`,
        );

        if (!this.isInfiniteMode && timeLeft <= 0) {
          this.isGameOver = true;
          if (this.score >= this.targetScore) this.endGame("win");
          else this.endGame("gameover");
          return;
        }
      }

      if (this.leanDirection === "LEFT")
        this.playerLeanAngle = Math.max(
          -30,
          this.playerLeanAngle - this.leanSpeed * dtSeconds,
        );
      else if (this.leanDirection === "RIGHT")
        this.playerLeanAngle = Math.min(
          30,
          this.playerLeanAngle + this.leanSpeed * dtSeconds,
        );

      this.player.setFrame(Math.abs(this.playerLeanAngle) < 15 ? 0 : 1);
      const shift = (this.playerLeanAngle / 30) * 18;
      let offX = 0,
        offY = 0;
      if (this.carrierTravelDir === "UP") offX = shift;
      else if (this.carrierTravelDir === "DOWN") offX = -shift;
      else if (this.carrierTravelDir === "RIGHT") offY = shift;
      else offY = -shift;

      this.player.setPosition(this.carrier.x + offX, this.carrier.y + offY);
      if (!this.isDoingTrick)
        this.player.setRotation(
          this.carrier.rotation + Phaser.Math.DegToRad(this.playerLeanAngle),
        );
    }

    const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
      this.carrierTravelDir
    ];
    this.carrier.setVelocity(v[0] * this.speed, v[1] * this.speed);

    this.bgStars.tilePositionX = this.cameras.main.scrollX * 0.1;
    this.bgStars.tilePositionY = this.cameras.main.scrollY * 0.1;

    if (
      Phaser.Math.Distance.Between(
        this.carrier.x,
        this.carrier.y,
        this.roadPieces[this.roadPieces.length - 1].x,
        this.roadPieces[this.roadPieces.length - 1].y,
      ) < 4500
    ) {
      this.generateTrackPiece();
    }
    if (this.roadPieces.length > 120) {
      const oldPiece = this.roadPieces.shift();
      this.destroyAsteroidsForPiece(oldPiece);
      oldPiece.destroy();
    }

    if (this.asteroids.length > 80) {
      const removeCount = this.asteroids.length - 80;
      for (let i = 0; i < removeCount; i++) {
        const oldAster = this.asteroids.shift();
        if (oldAster) oldAster.destroy();
      }
    }

    const cp = this.getPieceUnder(this.carrier);

    if (
      !this.isGameOver &&
      cp &&
      cp.trackType === "way_f" &&
      this.leanDirection !== "NONE" &&
      !this.game.isSpectator &&
      !this.tutorialActive
    ) {
      const upcoming = this.isCurveUpcoming(4);
      const correctLeaning =
        (upcoming === "way_r" && this.leanDirection === "RIGHT") ||
        (upcoming === "way_l" && this.leanDirection === "LEFT");

      if (!correctLeaning) {
        this.triggerFall();
      }
    }

    if (cp && cp !== this.carrier.lastTurnedPiece && cp.trackType !== "way_f") {
      let passed =
        (this.carrierTravelDir === "UP" && this.carrier.y <= cp.y) ||
        (this.carrierTravelDir === "DOWN" && this.carrier.y >= cp.y) ||
        (this.carrierTravelDir === "RIGHT" && this.carrier.x >= cp.x) ||
        (this.carrierTravelDir === "LEFT" && this.carrier.x <= cp.x);
      if (passed) {
        const turn = cp.trackType === "way_r" ? "RIGHT" : "LEFT";
        this.carrierTravelDir = {
          UP: { RIGHT: "RIGHT", LEFT: "LEFT" },
          RIGHT: { RIGHT: "DOWN", LEFT: "UP" },
          LEFT: { RIGHT: "UP", LEFT: "DOWN" },
          DOWN: { RIGHT: "LEFT", LEFT: "RIGHT" },
        }[this.carrierTravelDir][turn];
        this.carrier.setPosition(cp.x, cp.y);
        this.carrier.lastTurnedPiece = cp;
        this.updateCameraRotation();

        if (this.leanDirection === turn) {
          this.playerLeanAngle = 0;
          this.leanDirection = "NONE";
          this.sound.play("swoosh");
        } else {
          if (!this.tutorialActive) this.triggerFall();
          else {
            this.playerLeanAngle = 0;
            this.leanDirection = "NONE";
          }
        }
      }
    }

    if (
      !this.isGameOver &&
      !cp &&
      !this.game.isSpectator &&
      !this.tutorialActive
    )
      this.triggerFall();
  }

  getPieceUnder(target) {
    let closest = null,
      minDist = this.gridSize * 0.8;
    for (const p of this.roadPieces) {
      const d = Phaser.Math.Distance.Between(target.x, target.y, p.x, p.y);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return closest;
  }
}
