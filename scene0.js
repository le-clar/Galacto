class scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");

    this.Spaceship_6;
    this.cursors;
    this.score = 0;
    this.gameOver = false;
    this.scoreText;
  }

  preload() {
    this.load.spriteSheet("Spaceship_6", "assets/Spaceship_6.png", {
      frameWidth: 32,
      frameHeight: 32
    });

  }

  create() {
    this.Spaceship_6 = this.physics.add
      .sprite(400, 300, "Spaceship_6", 20)
      .setInteractive()
      .on("pointerdown", () => {
        this.Spaceship_6.play("walk-right");
        this.Spaceship_6.setVelocityX(100);
      });

    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("Spaceship_6", { start: -87, end: 95 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "stand-still",
      frames: this.anims.generateFrameNumbers("Spaceship_6", { start: 4, end: 4 }),
      frameRate: 20,
    });

    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("Spaceship_6", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1,
    });



    this.scoreText = this.add.text(16, 16, "score: 0", {
      fontSize: "32px",
      fill: "#000",
    });

    this.physics.add.collider(this.player, this.platforms);

    update() {
      if (this.gameOver) {
        return;
      }

      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160);

        this.player.anims.play("left", true);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);

        this.player.anims.play("right", true);
      } else {
        this.player.setVelocityX(0);

        this.player.anims.play("turn");
      }

      if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-330);
      }
    }

    collectStar(player, star) {
      star.disableBody(true, true);

      this.score += 10;
      this.scoreText.setText("Score: " + this.score);

      if (this.stars.countActive(true) === 0) {
        this.stars.children.iterate(function (child) {
          child.enableBody(true, child.x, 0, true, true);
        });

        var x =
          this.player.x < 400
            ? Phaser.Math.Between(400, 800)
            : Phaser.Math.Between(0, 400);

        var bomb = this.bombs.create(x, 16, "bomb");
        bomb.setBounce(1);
        bomb.setCollideWorldBounds(true);
        bomb.setVelocity(Phaser.Math.Between(-200, 200), 20);
        bomb.allowGravity = false;
      }
    }

    hitBomb(player, bomb) {
      this.physics.pause();
      this.player.setTint(0xff0000);
      this.player.anims.play("turn");
      this.gameOver = true;
    }
  }
}

export default scene0;
