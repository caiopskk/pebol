// Standalone opponent bot for testing: joins a room and picks on its own.
// Usage: tsx server/src/bot.ts <CODE> [name]
import { io } from "socket.io-client";
import type { RoomState } from "../../shared/types.js";
import { effectiveRating, openSlots } from "../../shared/engine.js";

const code = (process.argv[2] || "").toUpperCase();
const name = process.argv[3] || "Bot";
if (!code) { console.error("provide the room code"); process.exit(1); }

const s = io("http://localhost:3001", { transports: ["websocket"] });
let myId = "";

s.on("connect", () => {
  s.emit("joinRoom", { code, name }, (res: any) => {
    if (!res.ok) { console.error("join falhou:", res.error); process.exit(1); }
    myId = res.youId;
    console.log(`[${name}] entrou na sala ${code}`);
    s.emit("setup", { formationId: "4-3-3", mentality: "aura" });
    setTimeout(() => s.emit("ready"), 200);
  });
});

s.on("errorMsg", (m: string) => console.log(`[${name}] err:`, m));

s.on("roomUpdate", (st: RoomState) => {
  if (st.phase === "draft" && st.activePlayerId === myId) {
    const meP = st.players.find((p) => p.id === myId)!;
    const team = st.currentTeam!;
    const open = openSlots(meP);
    // pick the best available player for the lowest-penalty slot
    let best: { slot: string; player: string; score: number } | null = null;
    for (const pl of team.players) {
      if (st.takenThisRound.includes(pl.name)) continue;
      for (const slotId of open) {
        const slot = meP.formationId ? slotPos(st, slotId) : pl.pos;
        const score = effectiveRating(pl, slot);
        if (!best || score > best.score) best = { slot: slotId, player: pl.name, score };
      }
    }
    if (best) {
      setTimeout(() => s.emit("pick", { slotId: best!.slot, playerName: best!.player }), 500);
    }
  }
  if (st.phase === "result") {
    const won = st.result?.winnerId === myId;
    console.log(`[${name}] fim de jogo. ${won ? "ganhei :)" : "perdi"} — ${st.result?.summary}`);
  }
});

// needs the formation to resolve a slot's position
import { getFormation } from "../../shared/formations.js";
function slotPos(st: RoomState, slotId: string): any {
  const me = st.players.find((p) => p.id === myId)!;
  const f = getFormation(me.formationId!);
  return f?.slots.find((sl) => sl.id === slotId)?.pos ?? "CM";
}
