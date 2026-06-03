const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// In-memory state for infinite matches and leaderboard data.
io.infiniteMatches = {};
io.leaderboard = [];
io.leaderboardResetAt = Date.now() + 13 * 60 * 60 * 1000;

function resetLeaderboardIfExpired() {
  const now = Date.now();
  if (!io.leaderboard || now >= io.leaderboardResetAt) {
    io.leaderboard = [];
    io.leaderboardResetAt = now + 13 * 60 * 60 * 1000;
  }
}

function emitLeaderboardData(recipient) {
  recipient.emit(
    "leaderboard-data",
    io.leaderboard.slice(0, 10).map((entry) => ({
      name: entry.name,
      points: entry.points,
    })),
  );
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Each socket can join a room to play or spectate an infinite match.
  socket.on("join-room", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);
    // If there is an active infinite match, send current state to the joining client
    if (io.infiniteMatches && io.infiniteMatches[room]) {
      const m = io.infiniteMatches[room];
      // Prefer last full state if available so spectators get complete view
      if (m.lastState && typeof m.lastState === "object") {
        socket.emit("scene0", m.lastState);
      } else {
        socket.emit("scene0", { score: m.points || 0, time: m.time || 0 });
      }
    }
  });

  socket.on("leave-room", (room) => {
    try {
      socket.leave(room);
    } catch (e) {}
    // if this socket owned the match, end it
    if (io.infiniteMatches && io.infiniteMatches[room]) {
      const match = io.infiniteMatches[room];
      if (match.owner === socket.id) {
        io.to(room).emit("game-ended");
        delete io.infiniteMatches[room];
        io.emit("infinite-list", io.infiniteMatches);
      }
    }
  });

  // Create or register an infinite match
  socket.on("create-infinite", (room, name) => {
    io.infiniteMatches[room] = {
      name: String(name || "Anônimo").slice(0, 16),
      points: 0,
      time: 0,
      owner: socket.id,
    };
    socket.join(room);
    io.emit("infinite-list", io.infiniteMatches);
    console.log(`Infinite match created: ${room} by ${name}`);
  });

  // Spectator or others can request the current infinite list
  socket.on("request-infinite-list", () => {
    socket.emit("infinite-list", io.infiniteMatches || {});
  });

  // Return the last known full state for a given infinite match room
  socket.on("request-infinite-state", (room) => {
    if (io.infiniteMatches && io.infiniteMatches[room]) {
      const m = io.infiniteMatches[room];
      if (m.lastState && typeof m.lastState === "object") {
        socket.emit("scene0", m.lastState);
      } else {
        socket.emit("scene0", { score: m.points || 0, time: m.time || 0 });
      }
    }
  });

  // Player sends periodic updates about the infinite match state
  socket.on("update-infinite", (room, state) => {
    const match = io.infiniteMatches[room];
    if (match) {
      match.points = Number.isFinite(Number(state.score))
        ? Number(state.score)
        : match.points || 0;
      match.time = Number.isFinite(Number(state.time))
        ? Number(state.time)
        : match.time || 0;
      match.lastState = state;
      // Relay the full state to other clients in this room (spectators only).
      socket.to(room).emit("scene0", state);
    }
  });

  // End an infinite match: remove from list, save to leaderboard and notify spectators
  socket.on("end-infinite", (room) => {
    if (!io.infiniteMatches) io.infiniteMatches = {};
    const match = io.infiniteMatches[room];
    if (match) {
      const name = String(match.name || "Anônimo").slice(0, 16);
      const points = Number(match.points) || 0;
      const time = Number(match.time) || 0;

      // Add finished infinite match data to the leaderboard.
      resetLeaderboardIfExpired();
      io.leaderboard.push({ name, points, time, createdAt: Date.now() });
      io.leaderboard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.time - b.time;
      });
      if (io.leaderboard.length > 1000) {
        io.leaderboard = io.leaderboard.slice(0, 1000);
      }
      emitLeaderboardData(io);

      // Notify spectators in the room that the game ended
      io.to(room).emit("game-ended");
      // Remove match
      delete io.infiniteMatches[room];
      io.emit("infinite-list", io.infiniteMatches);
      console.log(`Infinite match ended: ${room}`);
    }
  });

  socket.on("select-player", (room, player) => {
    console.log(`Selected player ${player} in room ${room}`);
    socket.to(room).emit("player-selected", player);
  });

  socket.on("start-game", (room, player) => {
    console.log(`Game started in room ${room} by player ${player}`);
    socket.to(room).emit("start-game", player);
  });

  socket.on("change-scene", (room, scene) => {
    console.log(`Changing scene to ${scene} in room ${room}`);
    socket.to(room).emit("change-scene", scene);
  });

  socket.on("scene0", (room, state) => {
    socket.to(room).emit("scene0", state);
  });

  socket.on("submit-score", (data) => {
    if (!data || typeof data !== "object") return;
    const name = String(data.name || "Anônimo").slice(0, 16);
    const points = Number.isFinite(Number(data.points))
      ? Number(data.points)
      : 0;
    const time = Number.isFinite(Number(data.time)) ? Number(data.time) : 0;

    resetLeaderboardIfExpired();
    io.leaderboard.push({ name, points, time, createdAt: Date.now() });
    io.leaderboard.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.time - b.time;
    });
    if (io.leaderboard.length > 1000) {
      io.leaderboard = io.leaderboard.slice(0, 1000);
    }
    io.emit(
      "leaderboard-data",
      io.leaderboard.slice(0, 10).map((entry) => ({
        name: entry.name,
        points: entry.points,
        time: entry.time,
      })),
    );
  });

  socket.on("request-leaderboard", () => {
    resetLeaderboardIfExpired();
    emitLeaderboardData(socket);
  });

  socket.on("player-action", (room, action) => {
    socket.to(room).emit("player-action", action);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // remove any infinite matches owned by this socket
    if (io.infiniteMatches) {
      Object.keys(io.infiniteMatches).forEach((room) => {
        const m = io.infiniteMatches[room];
        if (m && m.owner === socket.id) {
          io.to(room).emit("game-ended");
          delete io.infiniteMatches[room];
        }
      });
      io.emit("infinite-list", io.infiniteMatches);
    }
  });
});

httpServer.listen(3000);
