import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import type { GameMode } from "../../shared/types.js";
import { isHardcoreMode } from "../../shared/gameMode.js";
import type {
  AckResult,
  Mentality,
  AttackFocus,
  HalftimeLineup,
} from "../../shared/types.js";
import {
  createRoom,
  joinRoom,
  findRoomByCode,
  findRoomBySocket,
  handleDisconnect,
  setup,
  ready,
  readyPreMatch,
  pick,
  rerollTeam,
  readyHalftime,
  rematch,
  toPublic,
  isAITurn,
  aiPick,
  setTeamPool,
} from "./rooms.js";
import { registerApi } from "./api.js";
import { initDb, getOfficialTeams, getUserProgress } from "./db.js";
import { userFromToken } from "./auth.js";
import { HARDCORE_UNLOCK_LEVEL } from "../../shared/progression.js";

// Load official clubs into the online draft pool, using the generic alias as the name
// so the live game never shows the real (copyrighted) club names.
async function refreshTeamCache(): Promise<void> {
  try {
    const clubs = await getOfficialTeams("club");
    if (clubs.length)
      setTeamPool(clubs.map((t) => ({ ...t, name: t.alias || t.name })));
  } catch (err) {
    console.error("[db] failed to load teams:", err);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth + team CRUD API (must come before the SPA fallback).
registerApi(app, () => void refreshTeamCache());

// In production, serve the built client (pnpm build -> dist/) on the same port.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../../dist");
app.use(express.static(distDir));
app.get(/^(?!\/(socket\.io|api)).*/, (_req, res) => {
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
  socket.on(
    "createRoom",
    async (
      data: {
        name: string;
        mode: GameMode;
        solo?: boolean;
        token?: string | null;
      },
      cb: (r: AckResult) => void,
    ) => {
      if (isHardcoreMode(data.mode)) {
        const user = userFromToken(data.token || undefined);
        if (!user) {
          cb?.({
            ok: false,
            error: "Entre na sua conta para jogar no modo Hardcore.",
          });
          return;
        }
        const progress = await getUserProgress(user.id);
        if (progress.level < HARDCORE_UNLOCK_LEVEL) {
          cb?.({
            ok: false,
            error: `Modo Hardcore desbloqueia no nível ${HARDCORE_UNLOCK_LEVEL}.`,
          });
          return;
        }
      }
      const { room, playerId } = createRoom(
        data.name,
        data.mode,
        socket.id,
        data.solo,
      );
      socket.join(room.code);
      cb?.({ ok: true, code: room.code, youId: playerId });
      broadcast(room.code);
    },
  );

  socket.on(
    "joinRoom",
    (data: { code: string; name: string }, cb: (r: AckResult) => void) => {
      const res = joinRoom(data.code, data.name, socket.id);
      if ("error" in res) {
        cb?.({ ok: false, error: res.error });
        return;
      }
      socket.join(res.room.code);
      cb?.({ ok: true, code: res.room.code, youId: res.playerId });
      broadcast(res.room.code);
    },
  );

  socket.on(
    "setup",
    (data: {
      formationId: string;
      mentality: Mentality;
      attackFocus?: AttackFocus;
    }) => {
      const room = findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;
      setup(
        room,
        player.id,
        data.formationId,
        data.mentality,
        data.attackFocus,
      );
      broadcast(room.code);
    },
  );

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

  socket.on("preMatchReady", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    readyPreMatch(room, player.id);
    broadcast(room.code);
  });

  socket.on("halftimeReady", (data?: HalftimeLineup) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    readyHalftime(room, player.id, data);
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

async function start() {
  await initDb();
  await refreshTeamCache();
  httpServer.listen(PORT, () => {
    console.log(`⚽ pebol server rodando em http://localhost:${PORT}`);
  });
}
start().catch((err) => {
  console.error("Falha ao iniciar:", err);
  process.exit(1);
});
