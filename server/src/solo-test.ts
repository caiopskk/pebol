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
    while (st && st.phase === "draft" && guard++ < 600) {
      if (st.activePlayerId === myId) {
        const meP = st.players.find((p) => p.id === myId)!;
        const open = openSlots(meP);
        const team = st.currentTeam!;
        if (open.length && team) {
          s.emit("pick", { slotId: open[0], playerName: team.players[0].name });
        }
      }
      if (guard % 25 === 0) {
        const picks = st.players.map((p) => p.picks.length).join("/");
        console.log(`  [draft] guard=${guard} active=${st.activePlayerId === myId ? "EU" : "IA"} picks=${picks}`);
      }
      await wait(120);
    }

    await wait(400);
    const fh = st?.result;
    console.log("\n=== 1º TEMPO (após draft) ===");
    console.log("fase:", st?.phase, "| 2º tempo pronto?", fh?.secondHalfReady);
    console.log("eventos 1º tempo:", fh?.timeline.length, "| placar HT:", fh ? `${fh.firstHalfGoals[myId]} x ${fh.firstHalfGoals[st!.players.find((p) => p.id !== myId)!.id]}` : "—");

    // confirm halftime with the current lineup -> server simulates the 2nd half
    const meP = st!.players.find((p) => p.id === myId)!;
    s.emit("halftimeReady", {
      formationId: meP.formationId,
      mentality: meP.mentality,
      picks: meP.picks.map((pk) => ({
        slotId: pk.slotId,
        name: pk.player.name,
        pos: pk.player.pos,
        rating: pk.player.rating,
        fromTeamId: pk.fromTeamId,
      })),
    });
    await wait(400);

    const r = st?.result;
    const oppId = st!.players.find((p) => p.id !== myId)!.id;
    console.log("\n=== SOLO RESULTADO FINAL ===");
    console.log("2º tempo pronto?", r?.secondHalfReady);
    console.log("eventos totais:", r?.timeline.length);
    console.log("tipos de evento:", [...new Set(r?.timeline.map((e) => e.type) ?? [])].join(", "));
    console.log("placar final:", r ? `${r.goals[myId]} x ${r.goals[oppId]}` : "—");
    console.log("summary:", r?.summary);
    const ok = !!r?.secondHalfReady && !!r.winnerId && st?.players.every((p) => p.picks.length === 11);
    s.close();
    process.exit(ok ? 0 : 1);
  });
});
