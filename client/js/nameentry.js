// Define e exporta a cena de Inserção de Nome (Name Entry), estendendo a classe Scene do Phaser
export default class NameEntry extends Phaser.Scene {
  constructor() {
    // Define o identificador único dessa cena como "nameentry"
    super("nameentry");
    // Array para guardar os elementos HTML reais (input, botão) que serão criados por cima do jogo
    this.domElements = [];
    // Variável para guardar a função que recalcula a posição das coisas quando a tela muda de tamanho
    this.resizeHandler = null;
  }

  // Método executado ao criar a tela
  create() {
    // Garante que não haja nenhum lixo HTML de execuções anteriores antes de começar
    this.cleanupDom();

    // Pega as dimensões atuais da tela do jogo
    const { width, height } = this.scale;

    const data = this.scene.settings.data || {};
    const isPrestart = !!data.prestart;

    // --- BLOCO: FUNDO E TEXTOS DO PHASER ---
    // Cria um fundo escuro semi-transparente que cobre a tela toda
    this.add.rectangle(0, 0, width, height, 0x050717, 0.95).setOrigin(0);

    // Title depends on whether we're asking the name before starting
    this.add
      .text(
        width / 2,
        height * 0.18,
        isPrestart ? "Digite seu nome" : "Fim de jogo",
        {
          fontSize: "44px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5); // Centraliza

    // If this is not prestart, show the last result (compat)
    const result = this.game.lastInfiniteResult || { score: 0, time: 0 };
    if (!isPrestart) {
      this.add
        .text(
          width / 2,
          height * 0.32,
          `Pontos: ${result.score}  ·  Tempo: ${result.time}s`,
          {
            fontSize: "28px",
            fill: "#ffff00",
            fontFamily: "MinhaFontePersonalizada",
          },
        )
        .setOrigin(0.5);
    }

    // --- BLOCO: CRIAÇÃO DE ELEMENTOS HTML (DOM) ---
    // Como a digitação de texto no Phaser pode ser complicada (principalmente em celulares),
    // é melhor criar elementos HTML reais e colocá-los "flutuando" por cima do jogo.

    // 1. Cria o botão de "Enviar"
    const button = document.createElement("button");
    button.textContent = "Enviar";
    button.style.position = "absolute";
    button.style.padding = "14px 24px";
    button.style.fontSize = "18px";
    button.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    button.style.background = "#6f5cf0"; // Cor roxa
    button.style.color = "#ffffff";
    button.style.border = "none";
    button.style.borderRadius = "12px"; // Bordas arredondadas
    button.style.cursor = "pointer"; // Muda o cursor do mouse
    button.style.outline = "none";

    // 2. Cria o campo de texto (Input)
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Seu nome";
    input.maxLength = 16; // Limita o tamanho do nome para não quebrar o placar
    input.autocomplete = "off"; // Desativa sugestões automáticas do teclado
    input.style.position = "absolute";
    input.style.padding = "14px 16px";
    input.style.fontSize = "18px";
    input.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    input.style.border = "2px solid #ffffff";
    input.style.borderRadius = "12px";
    input.style.background = "rgba(255,255,255,0.1)"; // Fundo levemente transparente
    input.style.color = "#ffffff";
    input.style.outline = "none";
    input.style.width = "320px";

    // 3. Cria um textinho informativo extra (também em HTML)
    const info = document.createElement("div");
    info.style.position = "absolute";
    info.style.color = "#d0d0ff";
    info.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    info.style.fontSize = "16px";
    info.style.textAlign = "center";
    info.style.width = "360px";

    // 4. Cria o botão de "Voltar"
    const backButton = document.createElement("button");
    backButton.textContent = "Voltar";
    backButton.style.position = "absolute";
    backButton.style.padding = "12px 22px";
    backButton.style.fontSize = "16px";
    backButton.style.fontFamily = "MinhaFontePersonalizada, sans-serif";
    backButton.style.background = "rgba(255,255,255,0.08)";
    backButton.style.color = "#ffffff";
    backButton.style.border = "2px solid #ffffff";
    backButton.style.borderRadius = "12px";
    backButton.style.cursor = "pointer";
    backButton.style.outline = "none";
    backButton.style.width = "120px";

    // --- BLOCO: POSICIONAMENTO DINÂMICO DOS ELEMENTOS HTML ---
    // Função que calcula exatamente onde os elementos HTML devem ficar em relação ao Canvas do jogo
    const updateDomPlacement = () => {
      // Pega a posição e tamanho real do canvas do jogo na tela do navegador
      const rect = this.game.canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.55; // Posiciona um pouco abaixo do meio

      // Ajusta as posições X e Y descontando a metade do tamanho de cada elemento para centralizá-los
      input.style.left = `${centerX - 160}px`;
      input.style.top = `${centerY - 28}px`;

      backButton.style.left = `${centerX - 135}px`;
      backButton.style.top = `${centerY + 52}px`;

      button.style.left = `${centerX + 15}px`;
      button.style.top = `${centerY + 52}px`;

      info.style.left = `${centerX - 180}px`;
      info.style.top = `${centerY + 110}px`;
    };

    // Adiciona os elementos criados no corpo (body) do site
    document.body.appendChild(input);
    document.body.appendChild(button);
    document.body.appendChild(backButton);
    document.body.appendChild(info);

    // Guarda na lista para podermos apagar depois
    this.domElements.push(input, button, backButton, info);

    // Roda a função de posicionar pela primeira vez
    updateDomPlacement();

    // Se o usuário redimensionar a janela do navegador, recalcula a posição dos HTMLs
    this.resizeHandler = () => updateDomPlacement();
    window.addEventListener("resize", this.resizeHandler);

    // --- BLOCO: EVENTOS DE ENVIO (CLICK E ENTER) ---
    // Função que é chamada ao clicar no botão
    this.submitHandler = () => this.submitName(input.value.trim(), isPrestart); // .trim() remove espaços em branco inúteis

    // Função que escuta o teclado para enviar quando apertar a tecla "Enter"
    this.keydownHandler = (event) => {
      if (event.key === "Enter") {
        this.submitName(input.value.trim());
      }
    };

    // Liga os eventos aos elementos HTML
    button.addEventListener("click", this.submitHandler);
    backButton.addEventListener("click", () => {
      this.cleanupDom();
      this.scene.start("menu");
    });
    input.addEventListener("keydown", this.keydownHandler);

    // Já deixa o campo de texto selecionado para o jogador só começar a digitar
    input.focus();
  }

  // --- BLOCO: FUNÇÃO DE ENVIO PARA O SERVIDOR ---
  submitName(name) {
    // Se o nome estiver vazio, não faz nada (bloqueia o envio)
    if (!name) return;

    // If this is a prestart name entry, create an infinite match and join
    const isPrestart = !!(
      this.scene.settings.data && this.scene.settings.data.prestart
    );
    if (isPrestart) {
      // assign player name and create a room for this infinite match
      this.game.playerName = name;
      if (!this.game.room) {
        this.game.room = (Math.random() * 10000).toString().split(".")[0];
      }

      const createHandler = () => {
        // Mark this client as the host/controller for the new infinite match
        this.game.isHost = true;
        this.game.isSpectator = false;
        this.game.socket.emit(
          "create-infinite",
          this.game.room,
          this.game.playerName,
        );
        this.game.socket.emit("join-room", this.game.room);
      };

      if (this.game.socket && this.game.socket.connected) {
        createHandler();
      } else if (this.game.socket) {
        this.game.socket.once("connect", createHandler);
      }

      this.cleanupDom();
      this.scene.start("scene0");
      return;
    }

    // Fallback: legacy behavior (submit score) -- kept for compatibility
    const result = this.game.lastInfiniteResult || { score: 0, time: 0 };
    this.scoreConnectHandler = () => {
      this.game.socket.emit("submit-score", {
        name,
        points: result.score,
        time: result.time,
      });
    };
    if (this.game.socket.connected) {
      this.scoreConnectHandler();
      this.scoreConnectHandler = null;
    } else {
      this.game.socket.once("connect", this.scoreConnectHandler);
    }
    this.cleanupDom();
    this.scene.start("leaderboard");
  }

  // --- BLOCO: LIMPEZA DOS ELEMENTOS HTML (PREVENÇÃO DE BUGS E VAZAMENTOS) ---
  // Esta função garante que os inputs não fiquem flutuando na tela quando a cena mudar
  cleanupDom() {
    // Percorre todos os elementos HTML criados e os remove da página
    this.domElements.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    this.domElements = []; // Esvazia a lista

    // Remove o evento de redimensionamento da janela do navegador
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    // Remove o evento de aguardar conexão do socket (se tiver)
    if (this.scoreConnectHandler) {
      this.game.socket.off("connect", this.scoreConnectHandler);
      this.scoreConnectHandler = null;
    }
  }

  // Método nativo do Phaser chamado ao parar/esconder a cena
  shutdown() {
    this.cleanupDom(); // Garante a limpeza
  }

  // Método nativo do Phaser chamado quando a cena é completamente destruída
  destroy() {
    this.cleanupDom(); // Garante a limpeza
    super.destroy(); // Chama a destruição padrão da classe pai
  }
}
