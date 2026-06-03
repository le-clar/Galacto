export default class Spectate extends Phaser.Scene {
  constructor() {
    super("spectate");
    this.domElements = [];
    this.listContainer = null;
    this.infiniteList = {};
  }

  create() {
    const { width, height } = this.scale;

    // Background da tela de espectador.
    this.add.rectangle(0, 0, width, height, 0x050717).setOrigin(0);
    this.add
      .text(width / 2, height * 0.08, "Partidas Ativas", {
        fontSize: "36px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5);

    // Create a floating HTML container to hold the list
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "50%";
    container.style.top = "20%";
    container.style.transform = "translateX(-50%)";
    container.style.width = "520px";
    container.style.maxHeight = "60vh";
    container.style.overflow = "auto";
    container.style.background = "rgba(10,10,20,0.8)";
    container.style.border = "2px solid #6f5cf0";
    container.style.borderRadius = "12px";
    container.style.padding = "12px";
    container.style.color = "#ffffff";

    document.body.appendChild(container);
    this.domElements.push(container);
    this.listContainer = container;

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "Voltar";
    backBtn.style.marginTop = "12px";
    backBtn.style.padding = "10px 16px";
    backBtn.style.borderRadius = "10px";
    backBtn.style.cursor = "pointer";
    backBtn.addEventListener("click", () => {
      this.cleanupDom();
      this.scene.start("menu");
    });
    container.appendChild(backBtn);
    this.domElements.push(backBtn);

    // Listen for infinite list updates from server
    if (this.game.socket) {
      this.game.socket.on("infinite-list", (list) => {
        this.infiniteList = list || {};
        this.renderList();
      });
      // Request initial list
      this.game.socket.emit("request-infinite-list");
    }
  }

  renderList() {
    if (!this.listContainer) return;
    // Remove old items except the back button (last child)
    while (this.listContainer.childNodes.length > 1) {
      this.listContainer.removeChild(this.listContainer.firstChild);
    }

    const keys = Object.keys(this.infiniteList || {});
    if (keys.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Nenhuma partida no momento.";
      empty.style.padding = "12px";
      this.listContainer.insertBefore(empty, this.listContainer.firstChild);
      return;
    }

    keys.forEach((roomId) => {
      const match = this.infiniteList[roomId];
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "8px";
      row.style.borderBottom = "1px solid rgba(255,255,255,0.06)";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${match.name || "Jogador"}</strong><br><small>Pts: ${match.points || 0} · ${match.time || 0}s</small>`;

      const btn = document.createElement("button");
      btn.textContent = "Assistir";
      btn.style.padding = "8px 12px";
      btn.style.borderRadius = "8px";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => this.joinAsSpectator(roomId));

      row.appendChild(info);
      row.appendChild(btn);
      this.listContainer.insertBefore(row, this.listContainer.firstChild);
    });
  }

  joinAsSpectator(roomId) {
    this.game.isSpectator = true;
    this.game.isHost = false;
    this.game.room = roomId;
    // stop menu music before spectating
    try {
      if (
        this.sound &&
        this.sound.get &&
        this.sound.get("menu") &&
        this.sound.get("menu").isPlaying
      ) {
        this.sound.get("menu").stop();
      }
    } catch (e) {}
    if (this.game.socket) this.game.socket.emit("join-room", roomId);
    this.cleanupDom();
    this.scene.start("scene0");
  }

  cleanupDom() {
    this.domElements.forEach((el) => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    this.domElements = [];
    if (this.game.socket) {
      this.game.socket.off("infinite-list");
    }
  }

  shutdown() {
    this.cleanupDom();
  }

  destroy() {
    this.cleanupDom();
    super.destroy();
  }
}
