// Define e exporta a cena do Menu Principal, estendendo a classe Scene do Phaser
export default class Menu extends Phaser.Scene {
  constructor() {
    // Define o identificador único dessa cena como "menu"
    super("menu");
  }

  // O método preload() é executado antes da cena abrir. Usado para carregar assets (imagens, sons, etc.) na memória.
  preload() {
    // Define a pasta base onde o jogo vai procurar os arquivos
    this.load.setPath("assets/");
    // Carrega a imagem de fundo e dá a ela a chave "phbg"
    this.load.image("phbg", "phbg.png");
  }

  // O método create() monta os elementos visuais na tela
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

    // --- BLOCO: FUNDO (BACKGROUND) ---
    // Adiciona a imagem de fundo bem no centro da tela
    this.bg = this.add.image(width / 2, height / 2, "phbg");
    // Calcula a escala necessária para a imagem cobrir toda a tela, sem achatar (efeito "cover")
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // --- BLOCO: TÍTULO DO JOGO ---
    // Cria o texto do título "GALACTO" na parte superior da tela
    this.titleText = this.add
      .text(width / 2, height * 0.15, "GALACTO", {
        fontSize: "64px",
        fill: "#9f88d8",
        fontStyle: "bold",
        fontFamily: "MinhaFontePersonalizada",
      })
      .setOrigin(0.5); // Centraliza a âncora do texto

    // --- BLOCO: CONFIGURAÇÕES DOS BOTÕES ---
    // Define a cor padrão dos botões
    const btnColor = 0x9f88d8; // provided color

    // Calcula a largura do botão (no máximo 360px ou 55% da tela) e define altura, posição inicial e espaço entre eles
    const btnWidth = Math.min(360, width * 0.55);
    const btnHeight = 48;
    const startY = height * 0.4;
    const gap = 16;

    // --- FUNÇÃO AUXILIAR: CRIADOR DE BOTÕES ---
    // Cria uma função reutilizável para desenhar os botões na tela mais facilmente
    const createButton = (x, y, label, onClick, widthOverride) => {
      const buttonWidth = widthOverride || btnWidth;

      // Cria a forma geométrica (retângulo) do botão, com borda branca e interatividade
      const rect = this.add
        .rectangle(x, y, buttonWidth, btnHeight, btnColor)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Cria o texto que vai dentro do botão
      const txt = this.add
        .text(x, y, label, {
          fontSize: "20px",
          fill: "#ffffff",
          fontFamily: "MinhaFontePersonalizada",
        })
        .setOrigin(0.5);

      // Associa a ação de clique (pointerdown) no botão à função (onClick) passada como parâmetro
      rect.on("pointerdown", () => {
        this.sound.play("button");

        if (onClick) onClick();
      });

      return { rect, txt };
    };

    // --- BLOCO: BOTÃO MODO HISTÓRIA ---
    // Cria o primeiro botão. Ao clicar, define o jogo como "não infinito" e vai para a cutscene
    createButton(width / 2, startY, "Modo historia", () => {
      this.game.isInfiniteMode = false;
      if (this.sound.get("menu") && this.sound.get("menu").isPlaying) {
        this.sound.get("menu").stop();
      }
      this.scene.stop("menu");
      this.scene.start("cutscene");
    });

    // --- BLOCO: DESBLOQUEIO DO MODO INFINITO ---
    let hasWon = false;
    let infiniteButton = null;
    let placarButton = null;
    let spectateButton = null;

    try {
      // Tenta ler no armazenamento do navegador (localStorage) se o jogador já venceu o modo história alguma vez
      hasWon = !!localStorage.getItem("galacto_hasWon");
    } catch (e) {
      hasWon = false;
    }

    const updateMenuPositions = () => {
      const infiniteY = startY + btnHeight + gap;
      const placarY = hasWon ? infiniteY + btnHeight + gap : infiniteY;
      const spectateY = placarY + btnHeight + gap;

      if (infiniteButton) {
        infiniteButton.rect.setY(infiniteY);
        infiniteButton.txt.setY(infiniteY);
      }

      if (placarButton) {
        placarButton.rect.setY(placarY);
        placarButton.txt.setY(placarY);
      }

      if (spectateButton) {
        spectateButton.rect.setY(spectateY);
        spectateButton.txt.setY(spectateY);
      }
    };

    const addInfiniteButton = () => {
      if (infiniteButton) return;
      hasWon = true;

      try {
        localStorage.setItem("galacto_hasWon", "1");
      } catch (e) {
        // ignore localStorage failures
      }

      infiniteButton = createButton(
        width / 2,
        startY + btnHeight + gap,
        "Modo Infinito",
        () => {
          this.game.isInfiniteMode = true;
          if (this.sound.get("menu") && this.sound.get("menu").isPlaying) {
            this.sound.get("menu").stop();
          }
          this.scene.stop("menu");
          this.scene.start("nameentry", { prestart: true });
        },
      );

      updateMenuPositions();
    };

    if (hasWon) {
      addInfiniteButton();
    }

    // --- BLOCO: BOTÃO DO PLACAR ---
    placarButton = createButton(
      width / 2,
      startY + (hasWon ? 2 * (btnHeight + gap) : btnHeight + gap),
      "Placar",
      () => {
        this.scene.stop("menu");
        this.scene.start("leaderboard");
      },
    );

    // --- BOTÃO: ESPECTAR ---
    spectateButton = createButton(
      width / 2,
      startY + (hasWon ? 3 * (btnHeight + gap) : 2 * (btnHeight + gap)),
      "Espectar",
      () => {
        if (this.sound.get("menu") && this.sound.get("menu").isPlaying) {
          this.sound.get("menu").stop();
        }
        this.scene.stop("menu");
        this.scene.start("spectate");
      },
    );

    // --- BOTÃO DE TESTE LATERAL ---
    const sideButtonWidth = Math.min(160, width * 0.25);
    createButton(
      width - sideButtonWidth / 2 - 16,
      startY,
      "Teste",
      () => {
        addInfiniteButton();
      },
      sideButtonWidth,
    );
  }
}
