const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // change later to your frontend URL
    methods: ["GET", "POST"]
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("🎮 Hide & Seek server is running!");
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("✅ New player connected:", socket.id);

  // Join room
  socket.on("join_room", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [] };
    }

    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      score: 0,
    });

    socket.join(roomId);
    io.to(roomId).emit("room_update", rooms[roomId]);
    console.log(`${playerName} joined room ${roomId}`);
  });

  // Start game
  socket.on("start_game", ({ roomId }) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("game_started", { timer: 60 });
      console.log(`Game started in room ${roomId}`);
    }
  });

  // Item found
  socket.on("found_item", ({ roomId, playerName }) => {
    let player = rooms[roomId]?.players.find(p => p.id === socket.id);
    if (player) {
      player.score += 10;
      io.to(roomId).emit("item_found", {
        player: playerName,
        score: player.score,
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      io.to(roomId).emit("room_update", rooms[roomId]);
    }
    console.log("❌ Player disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
