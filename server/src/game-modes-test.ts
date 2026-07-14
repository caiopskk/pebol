import assert from "node:assert/strict";
import { openSlots } from "../../shared/engine.js";
import { TEAMS } from "../../shared/data/teams.js";
import { WC_DRAFT_TEAMS } from "../../shared/data/worldcup.js";
import {
  gameModeLabel,
  gameModeStrengthScale,
  isHardcoreMode,
  isWorldCupMode,
} from "../../shared/gameMode.js";
import type { GameMode, HalftimeLineup, SquadPick } from "../../shared/types.js";
import {
  aiPick,
  createRoom,
  joinRoom,
  pick,
  ready,
  readyHalftime,
  readyPreMatch,
  rematch,
  rerollTeam,
  setTeamPool,
  setup,
  toPublic,
  type Room,
} from "./rooms.js";

const MODES: GameMode[] = ["classico", "hardcore", "worldcup", "worldcup-hardcore"];

function lineupFromPicks(picks: SquadPick[]): HalftimeLineup["picks"] {
  return picks.map((entry) => ({
    slotId: entry.slotId,
    name: entry.player.name,
    pos: entry.player.pos,
    rating: entry.player.rating,
    pac: entry.player.pac,
    sho: entry.player.sho,
    pas: entry.player.pas,
    dri: entry.player.dri,
    def: entry.player.def,
    phy: entry.player.phy,
    fromTeamId: entry.fromTeamId,
  }));
}

function finishDraft(room: Room): void {
  let guard = 40;
  while (room.phase === "draft" && guard-- > 0) {
    const active = room.players.find((player) => player.id === room.activePlayerId)!;
    if (active.isAI) {
      aiPick(room);
      continue;
    }
    const slotId = openSlots(active)[0];
    const playerName = room.currentTeam?.players[0]?.name;
    assert.ok(slotId && playerName, "every draft turn needs an open slot and a drawn player");
    assert.equal(pick(room, active.id, slotId, playerName), null);
  }
  assert.ok(guard > 0, "draft should finish within 22 picks");
  assert.equal(room.phase, "preMatch");
  assert.deepEqual(room.players.map((player) => player.picks.length), [11, 11]);
}

function assertModeFlow(mode: GameMode, solo: boolean): void {
  const { room, playerId: hostId } = createRoom(`Host ${mode}`, mode, `socket-${mode}-${solo}`, solo);
  if (!solo) {
    const joined = joinRoom(room.code, "Visitante", `guest-${mode}`);
    assert.ok(!("error" in joined), "guest should join a fresh PvP room");
  }
  assert.equal(room.players.length, 2);
  assert.equal(room.players[0].rerollsRemaining, isHardcoreMode(mode) ? 3 : 5);
  assert.equal(gameModeLabel(mode).includes("Seleções"), isWorldCupMode(mode));
  assert.equal(gameModeLabel(mode).includes("Hardcore"), isHardcoreMode(mode));

  for (const player of room.players) {
    setup(room, player.id, "4-3-3", "equilibrada", "equilibrado");
    ready(room, player.id);
  }
  assert.equal(room.phase, "draft");
  assert.equal(room.activePlayerId, hostId);

  const firstDrawId = room.currentTeam!.id;
  const rerollResult = rerollTeam(room, hostId);
  if (solo && isHardcoreMode(mode)) {
    assert.match(rerollResult ?? "", /indisponíveis/i);
    assert.equal(room.players[0].rerollsRemaining, 3);
    assert.equal(room.currentTeam!.id, firstDrawId);
  } else {
    assert.equal(rerollResult, null);
    assert.equal(room.players[0].rerollsRemaining, (isHardcoreMode(mode) ? 3 : 5) - 1);
    assert.notEqual(room.currentTeam!.id, firstDrawId, "reroll should discard the current draw");
  }

  const draftSnapshot = toPublic(room);
  assert.equal(draftSnapshot.hideRatings, isHardcoreMode(mode));
  assert.equal(
    draftSnapshot.pvpRerollsEnabled,
    !solo || !isHardcoreMode(mode),
    "reroll visibility must match the solo/Hardcore rule",
  );
  assert.ok(draftSnapshot.currentTeam);
  assert.ok(
    draftSnapshot.currentTeam!.players.every((player) =>
      isHardcoreMode(mode) ? player.rating === 0 && player.pac === undefined : player.rating > 0
    ),
    "Hardcore must hide every rating and attribute only during the draft",
  );

  finishDraft(room);
  const expectedPool = new Set((isWorldCupMode(mode) ? WC_DRAFT_TEAMS : TEAMS).map((team) => team.id));
  const sourceIds = room.players.flatMap((player) => player.picks.map((entry) => entry.fromTeamId));
  assert.ok(sourceIds.every((id) => expectedPool.has(id)), "each mode must draft from its own team pool");
  assert.equal(new Set(sourceIds).size, sourceIds.length, "drawn teams should not repeat before the pool is exhausted");
  assert.ok(
    toPublic(room).players.flatMap((player) => player.picks).every((entry) => entry.player.rating > 0),
    "ratings must return after the Hardcore draft",
  );

  const host = room.players.find((player) => player.id === hostId)!;
  const opponent = room.players.find((player) => player.id !== hostId)!;
  opponent.picks = host.picks.map((entry) => ({
    ...entry,
    player: { ...entry.player },
  }));
  opponent.formationId = host.formationId;
  setup(room, host.id, host.formationId!, "pressao", "lados");
  setup(room, opponent.id, opponent.formationId!, "pressao", "lados");
  readyPreMatch(room, host.id);
  if (!solo) readyPreMatch(room, opponent.id);

  assert.equal(room.phase, "result");
  assert.equal(room.result?.secondHalfReady, false);
  assert.ok(room.result?.timeline.some((event) => event.type === "halftime"));
  const hostStrength = room.result!.strengths[host.id].overall;
  const opponentStrength = room.result!.strengths[opponent.id].overall;
  assert.equal(opponentStrength, hostStrength, "the public strength report must keep raw lineup values comparable");
  assert.equal(
    gameModeStrengthScale(mode, opponent.isAI),
    solo && isHardcoreMode(mode) ? 1.025 : 1,
    "only the Hardcore AI should receive a hidden simulation modifier",
  );

  const firstHalfTimeline = structuredClone(room.result!.timeline);
  readyHalftime(room, host.id, {
    formationId: host.formationId!,
    mentality: "retranca",
    attackFocus: "meio",
    picks: lineupFromPicks(host.picks),
  });
  assert.equal(host.mentality, "retranca");
  assert.equal(host.attackFocus, "meio");
  if (!solo) {
    assert.equal(room.result?.secondHalfReady, false, "PvP must wait for both halftime confirmations");
    readyHalftime(room, opponent.id, {
      formationId: opponent.formationId!,
      mentality: opponent.mentality!,
      attackFocus: opponent.attackFocus,
      picks: lineupFromPicks(opponent.picks),
    });
  }

  assert.equal(room.result?.secondHalfReady, true);
  assert.deepEqual(room.result!.timeline.slice(0, firstHalfTimeline.length), firstHalfTimeline, "second-half simulation must preserve the first-half timeline");
  assert.equal(room.result!.timeline.at(-1)?.type, "fulltime");
  assert.ok(room.result!.winnerId, "single-match modes must resolve a winner");
  assert.equal(room.result!.goals[host.id] + room.result!.goals[opponent.id] >= 0, true);

  rematch(room);
  assert.equal(room.phase, "lobby");
  assert.equal(room.result, null);
  assert.ok(room.players.every((player) => player.picks.length === 0));
  assert.equal(host.rerollsRemaining, isHardcoreMode(mode) ? 3 : 5);
  assert.equal(host.ready, false);
  assert.equal(opponent.ready, solo);
}

setTeamPool(TEAMS);
for (const mode of MODES) {
  assertModeFlow(mode, false);
  assertModeFlow(mode, true);
}

console.log("[game-modes-test] ok - 4 modos, PvP e contra IA");
