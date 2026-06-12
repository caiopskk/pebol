// Tests solo mode: human + AI. The AI should draft on its own and produce a result.
import { io } from "socket.io-client";
import type { RoomState } from "../../shared/types.js";
import { openSlots } from "../../shared/engine.js";

const s = io("http://localhost:3001", { transports: ["websocket"] });
let myId = "";
let st: RoomState | null = null;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

s.on("roomUpdate", (x: RoomState) => (st = x));
s.on("errorMsg", (m) => console.log("[ERR]", m));

s.on("connect", () => {
  s.emit("createRoom", { name: "Solo", mode: "classico", solo: true }, async (res: any) => {
    myId = res.youId;
    console.log("sala solo:", res.code, "jogadores:", st?.players.map((p) => p.name));
    s.emit("setup", { formationId: "4-3-3", mentality: "equilibrada" });
    await wait(150);
    s.emit("ready");
    await wait(300);
    console.log("fase após ready:", st?.phase, "| IA pronta?", st?.players[1]?.ready);

    // play the human's turns; the AI plays its own (server-driven)
    let guard = 0;
    while (st && st.phase === "draft" && guard++ < 250) {
      if (st.activePlayerId === myId) {
        const meP = st.players.find((p) => p.id === myId)!;
        const open = openSlots(meP);
        const team = st.currentTeam!;
        if (open.length && team) {
          s.emit("pick", { slotId: open[0], playerName: team.players[0].name });
        }
      }
      await wait(120);
    }

    await wait(400);
    const r = st?.result;
    console.log("\n=== SOLO RESULTADO ===");
    console.log("fase:", st?.phase);
    console.log("picks humano:", st?.players.find((p) => p.id === myId)?.picks.length);
    console.log("picks IA:", st?.players.find((p) => p.id !== myId)?.picks.length);
    console.log("summary:", r?.summary);
    console.log("placar:", r ? `${r.goals[myId]} x ${r.goals[st!.players.find((p) => p.id !== myId)!.id]}` : "—");
    s.close();
    process.exit(r && st?.players.every((p) => p.picks.length === 11) ? 0 : 1);
  });
});
