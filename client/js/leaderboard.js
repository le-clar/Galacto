// Define e exporta a cena do Placar (Leaderboard), estendendo a classe Scene do Phaser
export default class Leaderboard extends Phaser.Scene {
  constructor() {
    // Define o identificador único dessa cena como "leaderboard"
    super("leaderboard");

    // Variáveis auxiliares para controle de elementos na tela e redimensionamento
    this.domElements = [];
    this.resizeHandler = null;
  }

  // Método init() roda antes do create(), ideal para resetar variáveis toda vez que a tela for aberta
  init() {
    // Inicializa ou zera a lista (array) do placar
    this.leaderboard = [];
  }

  create() {
    // Pega as dimensões atuais da tela do jogo
    const { width, height } = this.scale;

    //MÚSICA
    if (!this.sound.get("menu")) {
      const musica = this.sound.add("menu", {
        loop: true,
        volume: 0.5,
      });
      musica.play();
    } else if (!this.sound.get("menu").isPlaying) {
      this.sound.get("menu").play();
    }

    // --- BLOCO: ELEMENTOS VISUAIS E BACKGROUND ---
    // Cria um retângulo escuro e semi-transparente para servir de fundo da tela
    this.add.rectangle(0, 0, width, height, 0x050717, 0.95).setOrigin(0);

    // Adiciona o título principal "PLACAR" no topo da tela
    this.add
      .text(width / 2, height * 0.1, "PLACAR", {
        fontSize: "52px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        fontStyle: "bold",
      })
      .setOrigin(0.5); // setOrigin(0.5) garante que o texto fique centralizado nesse ponto

    // Cria o texto principal onde os jogadores e pontuações vão aparecer.
    // Começa com "Carregando..." enquanto o servidor não envia os dados.
    this.entriesText = this.add
      .text(width / 2, height * 0.27, "Carregando...", {
        fontSize: "22px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        align: "center",
      })
      .setOrigin(0.5, 0); // Origin X centralizado, Origin Y no topo para o texto crescer para baixo

    // --- BLOCO: BOTÃO DE VOLTAR ---
    // Cria o botão para voltar ao menu principal
    const backBtn = this.add
      .text(width / 2, height * 0.92, "VOLTAR", {
        fontSize: "28px",
        fill: "#ffffff",
        fontFamily: "MinhaFontePersonalizada",
        backgroundColor: "#6f5cf0", // Cor de fundo roxa do botão
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true }); // Torna clicável e muda o cursor do mouse

    // Evento de clique no botão VOLTAR
    backBtn.on("pointerdown", () => {
      this.scene.stop("leaderboard"); // Para a cena do placar
      this.scene.start("menu"); // Inicia a cena do menu
    });

    // --- BLOCO: COMUNICAÇÃO COM O SERVIDOR (SOCKET.IO) ---
    // Função que vai lidar com a resposta do servidor contendo os dados do placar
    this.leaderboardHandler = (leaderboard) => {
      if (!this.entriesText || !this.scene || !this.sys) {
        return;
      }
      // Garante que o que chegou é um array, senão usa um array vazio
      this.leaderboard = Array.isArray(leaderboard) ? leaderboard : [];
      // Atualiza o texto na tela com os dados recebidos
      this.updateLeaderboardText();

      // Limpa o timer de erro (timeout), já que os dados chegaram com sucesso
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    };

    // Função auxiliar que engatilha a requisição caso o socket precise reconectar
    this.connectHandler = () => {
      requestLeaderboard();
    };

    // Função que faz o pedido dos dados ao servidor
    const requestLeaderboard = () => {
      // Começa a escutar o evento "leaderboard-data" vindo do servidor
      this.game.socket.on("leaderboard-data", this.leaderboardHandler);
      // Pede para o servidor enviar os dados do placar
      this.game.socket.emit("request-leaderboard");

      // Define um timer de limite de tempo (2.5 segundos)
      // Se os dados não chegarem nesse tempo, mostra mensagem de falha
      this.timeoutId = window.setTimeout(() => {
        if (this.entriesText && this.scene && this.sys) {
          this.entriesText.setText(
            "Falha ao carregar o placar. Tente novamente mais tarde.",
          );
        }
      }, 2500);
    };

    // Verifica se já estamos conectados ao servidor
    if (this.game.socket.connected) {
      // Se sim, já pede os dados imediatamente
      requestLeaderboard();
    } else {
      // Se não, aguarda o evento de "connect" acontecer primeiro para então pedir os dados
      this.game.socket.once("connect", this.connectHandler);
    }

    // Garante que a limpeza de listeners aconteça ao desligar esta cena.
    this.events.once("shutdown", this.shutdown, this);
  }

  // --- BLOCO: LIMPEZA DA CENA ---
  // O método shutdown() roda sempre que a cena é parada (stop)
  // É fundamental para evitar vazamento de memória e sobreposição de eventos (listeners duplicados)
  shutdown() {
    if (this.leaderboardHandler) {
      this.game.socket.off("leaderboard-data", this.leaderboardHandler); // Para de escutar o placar
      this.leaderboardHandler = null;
    }
    if (this.connectHandler) {
      this.game.socket.off("connect", this.connectHandler); // Para de escutar conexão
      this.connectHandler = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId); // Cancela o cronômetro de erro, se ainda estiver rodando
      this.timeoutId = null;
    }
  }

  // --- BLOCO: FORMATAÇÃO DO TEXTO ---
  // Transforma o array de dados puro em um texto bonito para ser lido na tela
  updateLeaderboardText() {
    if (!this.entriesText || !this.scene || !this.sys) {
      return;
    }

    // Se a lista estiver vazia, avisa que não tem resultados
    if (!this.leaderboard.length) {
      this.entriesText.setText("Nenhum resultado registrado ainda.");
      return;
    }

    // Pega apenas os 5 primeiros resultados (.slice(0, 5))
    const formatted = this.leaderboard
      .slice(0, 5)
      .map((entry, index) => {
        return `${index + 1}. ${entry.name} — ${entry.points} pts`;
      })
      .join("\n\n");

    // Aplica o texto final formatado no elemento visual da tela
    this.entriesText.setText(formatted);
  }
}
