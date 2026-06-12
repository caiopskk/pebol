import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import type { AckResult, Mentality } from "../../shared/types.js";
import {
  createRoom,
  joinRoom,
  findRoomByCode,
  findRoomBySocket,
  handleDisconnect,
  setup,
  ready,
  pick,
  rerollTeam,
  rematch,
  toPublic,
  isAITurn,
  aiPick,
} from "./rooms.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// In production, serve the built client (pnpm build -> dist/) on the same port.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../dist");
app.use(express.static(distDir));
app.get(/^(?!\/socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

function broadcast(code: string) {
  const room = findRoomByCode(code);
  if (room) io.to(code).emit("roomUpdate", toPublic(room));
}

/** When it is the AI's turn, it picks (after a short delay) and the state is re-broadcast. */
function driveAI(code: string) {
  const room = findRoomByCode(code);
  if (!room || !isAITurn(room)) return;
  setTimeout(() => {
    const r = findRoomByCode(code);
    if (!r || !isAITurn(r)) return;
    aiPick(r);
    broadcast(code);
    driveAI(code); // caso a IA tenha turnos consecutivos
  }, 3000);
}

io.on("connection", (socket) => {
  socket.on("createRoom", (data: { name: string; mode: "classico" | "pica"; solo?: boolean }, cb: (r: AckResult) => void) => {
    const { room, playerId } = createRoom(data.name, data.mode, socket.id, data.solo);
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, youId: playerId });
    broadcast(room.code);
  });

  socket.on("joinRoom", (data: { code: string; name: string }, cb: (r: AckResult) => void) => {
    const res = joinRoom(data.code, data.name, socket.id);
    if ("error" in res) {
      cb?.({ ok: false, error: res.error });
      return;
    }
    socket.join(res.room.code);
    cb?.({ ok: true, code: res.room.code, youId: res.playerId });
    broadcast(res.room.code);
  });

  socket.on("setup", (data: { formationId: string; mentality: Mentality }) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    setup(room, player.id, data.formationId, data.mentality);
    broadcast(room.code);
  });

  socket.on("ready", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    ready(room, player.id);
    broadcast(room.code);
    driveAI(room.code); // in case the draft started and the AI picks first
  });

  socket.on("pick", (data: { slotId: string; playerName: string }) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    const err = pick(room, player.id, data.slotId, data.playerName);
    if (err) {
      socket.emit("errorMsg", err);
    }
    broadcast(room.code);
    driveAI(room.code); // after the human, let the AI take its turn
  });

  socket.on("rerollTeam", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    const err = rerollTeam(room, player.id);
    if (err) socket.emit("errorMsg", err);
    broadcast(room.code);
  });

  socket.on("rematch", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    rematch(room);
    broadcast(room.code);
  });

  socket.on("disconnect", () => {
    const room = handleDisconnect(socket.id);
    if (room) broadcast(room.code);
  });
});

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`⚽ pebol server rodando em http://localhost:${PORT}`);
});
