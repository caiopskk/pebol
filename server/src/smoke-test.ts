// Smoke test: runs a full 1v1 match via socket.io-client.
// Uso: node_modules/.bin/tsx server/src/smoke-test.ts
import { io, Socket } from "socket.io-client";
import type { RoomState } from "../../shared/types.js";
import { openSlots } from "../../shared/engine.js";

const URL = "http://localhost:3001";

function client(): Socket {
  return io(URL, { transports: ["websocket"] });
}

function emitAck<T>(s: Socket, ev: string, data: any): Promise<T> {
  return new Promise((res) => s.emit(ev, data, res));
}

async function main() {
  const a = client();
  const b = client();
  await new Promise<void>((r) => a.on("connect", () => r()));
  await new Promise<void>((r) => b.on("connect", () => r()));

  let stateA: RoomState | null = null;
  let stateB: RoomState | null = null;
  a.on("roomUpdate", (s) => (stateA = s));
  b.on("roomUpdate", (s) => (stateB = s));
  a.on("errorMsg", (m) => console.log("[A ERR]", m));
  b.on("errorMsg", (m) => console.log("[B ERR]", m));

  const created: any = await emitAck(a, "createRoom", { name: "Caio", mode: "classico" });
  console.log("createRoom:", created);
  const idA = created.youId;
  const code = created.code;

  const joined: any = await emitAck(b, "joinRoom", { code, name: "Leo" });
  console.log("joinRoom:", joined);
  const idB = joined.youId;

  a.emit("setup", { formationId: "4-3-3", mentality: "aura" });
  b.emit("setup", { formationId: "4-4-2", mentality: "retranca" });
  await wait(150);
  a.emit("ready");
  b.emit("ready");
  await wait(250);

  const snap = () => stateA as RoomState | null;
  console.log("phase apos ready:", snap()?.phase);

  // draft loop
  let guard = 0;
  while (snap()?.phase === "draft" && guard++ < 60) {
    const s = snap()!;
    const activeIsA = s.activePlayerId === idA;
    const sock = activeIsA ? a : b;
    const myId = activeIsA ? idA : idB;
    const meP = s.players.find((p) => p.id === myId)!;
    const team = s.currentTeam!;
    const open = openSlots(meP);
    const avail = team.players.find((pl) => !s.takenThisRound.includes(pl.name))!;
    if (!open.length) { console.log("SEM VAGAS?!", meP.picks.length); break; }
    sock.emit("pick", { slotId: open[0], playerName: avail.name });
    await wait(60);
  }

  await wait(300);
  const fin = snap();
  const finB = stateB as RoomState | null;
  console.log("\n=== RESULTADO ===");
  console.log("phase:", fin?.phase);
  const r = fin?.result;
  if (r && fin) {
    console.log("summary:", r.summary);
    console.log("placar:", `${r.goals[idA]} x ${r.goals[idB]}`);
    console.log("eventos na timeline:", r.timeline.length);
    console.log("tipos de evento:", [...new Set(r.timeline.map((e) => e.type))].join(", "));
    console.log("pênaltis?", r.shootout ? `${r.shootout.length} cobranças` : "não");
    console.log("strengths A:", r.strengths[idA]);
    console.log("strengths B:", r.strengths[idB]);
    console.log("picks A:", fin.players.find((p) => p.id === idA)?.picks.length);
    console.log("picks B:", fin.players.find((p) => p.id === idB)?.picks.length);
    console.log("winner:", r.winnerId === idA ? "Caio" : r.winnerId === idB ? "Leo" : "?");
    console.log("sync check (B same phase):", finB?.phase, "B result?", !!finB?.result);
  } else {
    console.log("SEM RESULTADO — algo falhou");
  }

  a.close();
  b.close();
  process.exit(r ? 0 : 1);
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
