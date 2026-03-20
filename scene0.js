export default class Scene0 extends Phaser.Scene {
  constructor() {
    super("scene0");
  }

  preload() {
    this.load.image("logo", "assets/pixel-art.png");

    this.load.spritesheet("nave", "assets/nave.png", {
      frameWidth: 28,
      frameHeight: 19,
    });
  }

  create() {
    const { width, height } = this.scale;

    // fundo
    const bg = this.add.image(width / 2, height / 2, "logo");

    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY) * 1.3;

    bg.setScale(scale);
    bg.setDepth(0); // fundo atrás

    // player
    this.player = this.add.sprite(width / 2, height * 0.85, "nave");
    this.player.setScale(3);
    this.player.setFrame(2);
    this.player.setDepth(1); // nave na frente

    // controle
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

    // loop de animação suave
    this.time.addEvent({
      delay: 80, // velocidade da animação (menor = mais rápido)
      loop: true,
      callback: () => this.updateAnimation(),
    });
  }

  update() {
    if (!this.isPressing || !this.pointer) return;

    const { width } = this.scale;

    if (this.pointer.x > width / 2) {
      this.targetSide = "right";
    } else {
      this.targetSide = "left";
    }
  }

  updateAnimation() {
    // 👉 indo pra direita
    if (this.targetSide === "right") {
      if (this.currentFrame > 0) {
        this.currentFrame--;
      }
    }

    // 👈 indo pra esquerda
    else if (this.targetSide === "left") {
      if (this.currentFrame < 4) {
        this.currentFrame++;
      }
    }

    // ⏸ voltando pro centro
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
