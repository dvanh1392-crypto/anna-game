const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const rooms = new Map();
const ROUND_SECONDS = 5;
const WIN_SCORE = 20;

function makeCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function publicRoom(room) {
  return {
    code: room.code,
    status: room.status,
    players: room.players.map(p => ({
      name: p.name,
      score: p.score,
      connected: p.connected
    })),
    round: room.round,
    deadline: room.deadline,
    lastResult: room.lastResult,
    winner: room.winner
  };
}

function emitRoom(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}

function findPlayer(room, token) {
  return room.players.find(p => p.token === token);
}

function beginRound(room) {
  if (room.players.length !== 2 || room.status === "finished") return;
  room.status = "playing";
  room.round += 1;
  room.choices = {};
  room.deadline = Date.now() + ROUND_SECONDS * 1000;
  room.lastResult = null;
  emitRoom(room);

  clearTimeout(room.timer);
  room.timer = setTimeout(() => finishRound(room), ROUND_SECONDS * 1000);
}

function finishRound(room) {
  if (!room || room.status !== "playing") return;
  clearTimeout(room.timer);

  const [a, b] = room.players;
  const ca = room.choices[a.token] || null;
  const cb = room.choices[b.token] || null;

  let winnerToken = null;
  let message = "";

  if (!ca && !cb) {
    message = "Cả hai chưa chọn. Lượt này hòa!";
  } else if (!ca && cb) {
    winnerToken = b.token;
    message = `${b.name} thắng vì ${a.name} không chọn kịp!`;
  } else if (ca && !cb) {
    winnerToken = a.token;
    message = `${a.name} thắng vì ${b.name} không chọn kịp!`;
  } else if (ca === cb) {
    message = "Hai người chọn giống nhau. Hòa!";
  } else {
    const beats = { rock: "scissors", scissors: "paper", paper: "rock" };
    if (beats[ca] === cb) winnerToken = a.token;
    else winnerToken = b.token;
    const winner = findPlayer(room, winnerToken);
    message = `${winner.name} thắng lượt này!`;
  }

  if (winnerToken) {
    const winner = findPlayer(room, winnerToken);
    winner.score += 1;
  }

  const gameWinner = room.players.find(p => p.score >= WIN_SCORE);
  room.status = gameWinner ? "finished" : "result";
  room.winner = gameWinner ? gameWinner.name : null;
  room.lastResult = {
    message,
    choices: room.players.map(p => ({
      name: p.name,
      choice: room.choices[p.token] || null
    })),
    winnerToken,
    scores: room.players.map(p => ({ name: p.name, score: p.score }))
  };
  room.deadline = null;
  emitRoom(room);
}

io.on("connection", socket => {
  socket.on("room:create", ({ name, token }) => {
    if (!name || !token) return socket.emit("error:message", "Vui lòng nhập tên hợp lệ.");
    const code = makeCode();
    const room = {
      code,
      status: "waiting",
      players: [{ name: String(name).trim().slice(0, 18), token, socketId: socket.id, score: 0, connected: true }],
      round: 0,
      deadline: null,
      choices: {},
      lastResult: null,
      winner: null,
      timer: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.emit("room:joined", { code, token });
    emitRoom(room);
  });

  socket.on("room:join", ({ code, name, token }) => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit("error:message", "Không tìm thấy phòng. Hãy kiểm tra lại mã phòng.");
    if (!name || !token) return socket.emit("error:message", "Vui lòng nhập tên hợp lệ.");

    let player = findPlayer(room, token);
    if (!player) {
      if (room.players.length >= 2) return socket.emit("error:message", "Phòng đã đủ 2 người chơi.");
      player = { name: String(name).trim().slice(0, 18), token, socketId: socket.id, score: 0, connected: true };
      room.players.push(player);
    } else {
      player.socketId = socket.id;
      player.connected = true;
    }

    socket.join(code);
    socket.emit("room:joined", { code, token });
    if (room.players.length === 2 && room.status === "waiting") {
      room.status = "ready";
    }
    emitRoom(room);
  });

  socket.on("round:start", ({ code, token }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || !findPlayer(room, token)) return;
    if (room.players.length !== 2 || room.status === "playing" || room.status === "finished") return;
    beginRound(room);
  });

  socket.on("player:choose", ({ code, token, choice }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing" || !findPlayer(room, token)) return;
    if (!["rock", "paper", "scissors"].includes(choice)) return;
    if (Date.now() >= room.deadline || room.choices[token]) return;
    room.choices[token] = choice;
    io.to(room.code).emit("player:locked", { token });
    if (Object.keys(room.choices).length === 2) {
      clearTimeout(room.timer);
      setTimeout(() => finishRound(room), 350);
    }
  });

  socket.on("round:next", ({ code, token }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || !findPlayer(room, token) || room.status !== "result") return;
    // Any player may start the next round; status changes immediately to prevent duplicate starts.
    beginRound(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        emitRoom(room);
      }
    }
  });
});

server.listen(PORT, () => console.log(`Game server listening on ${PORT}`));
