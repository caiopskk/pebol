import assert from "node:assert/strict";
import { ACHIEVEMENTS } from "../../shared/achievements.js";
import { FORMATIONS } from "../../shared/formations.js";
import {
  gameModeLabel,
  isHardcoreMode,
  isWorldCupMode,
} from "../../shared/gameMode.js";
import type {
  GameMode,
  MatchResult,
  PlayerPublic,
  RoomState,
  SquadPick,
} from "../../shared/types.js";
import {
  draftAchievementIds,
  regularMatchAchievementAwards,
} from "./lib/achievementRules.js";

function picks(rating: number): SquadPick[] {
  return FORMATIONS[0].slots.map((slot, index) => ({
    slotId: slot.id,
    fromTeamId: "test-team",
    effectiveRating: rating,
    player: {
      name: `Jogador ${index + 1}`,
      pos: slot.pos,
      rating,
    },
  }));
}

function player(id: string, isAI = false): PlayerPublic {
  return {
    id,
    name: id,
    connected: true,
    isAI,
    ready: true,
    formationId: "4-3-3",
    mentality: "equilibrada",
    attackFocus: "equilibrado",
    picks: picks(88),
  };
}

function state(mode: GameMode, result: MatchResult): RoomState {
  return {
    code: `T-${mode}`,
    phase: "result",
    mode,
    hostId: "you",
    totalSlots: 11,
    players: [player("you"), player("opp")],
    currentTeam: null,
    round: 22,
    activePlayerId: null,
    takenThisRound: [],
    usedTeamIds: [],
    pvpRerollsEnabled: true,
    hideRatings: isHardcoreMode(mode),
    result,
  };
}

function result(
  winnerId: string,
  goals: Record<string, number>,
  penaltyScore: Record<string, number> | null = null,
): MatchResult {
  return {
    homeId: "you",
    awayId: "opp",
    timeline: [
      {
        minute: 10,
        type: "goal",
        side: "home",
        text: "Gol do Seu time.",
        player: "Jogador 1",
        assist: "Jogador 2",
      },
      { minute: 90, type: "fulltime", side: null, text: "Fim de jogo." },
    ],
    secondHalfReady: true,
    firstHalfGoals: goals,
    goals,
    shootout: penaltyScore ? [] : null,
    penaltyScore,
    strengths: {
      you: { attack: 88, midfield: 88, defense: 88, overall: 88 },
      opp: { attack: 80, midfield: 80, defense: 80, overall: 80 },
    },
    winnerId,
    summary: "Teste",
  };
}

assert.equal(isWorldCupMode("worldcup"), true);
assert.equal(isWorldCupMode("worldcup-hardcore"), true);
assert.equal(isWorldCupMode("classico"), false);
assert.equal(isHardcoreMode("hardcore"), true);
assert.equal(isHardcoreMode("worldcup-hardcore"), true);
assert.equal(gameModeLabel("worldcup-hardcore"), "Seleções · Hardcore");

assert.deepEqual(
  draftAchievementIds(picks(90), "4-3-3", "classico").filter((id) =>
    id.startsWith("worldcup_pvp_"),
  ),
  [],
);

const worldCupDraft = draftAchievementIds(picks(90), "4-3-3", "worldcup");
assert.ok(worldCupDraft.includes("worldcup_pvp_strong_draft"));
assert.ok(worldCupDraft.includes("worldcup_pvp_elite_draft"));
assert.equal(worldCupDraft.includes("worldcup_pvp_hardcore_draft"), false);

const worldCupHardcoreDraft = draftAchievementIds(
  picks(85),
  "4-3-3",
  "worldcup-hardcore",
);
assert.ok(worldCupHardcoreDraft.includes("worldcup_pvp_strong_draft"));
assert.ok(worldCupHardcoreDraft.includes("worldcup_pvp_hardcore_draft"));

const clubWin = regularMatchAchievementAwards(
  state("classico", result("you", { you: 1, opp: 0 })),
  player("you"),
  player("opp"),
);
assert.ok(clubWin?.ids.includes("pvp_win"));
assert.ok(clubWin?.ids.includes("pvp_club_win"));
assert.equal(clubWin?.ids.includes("pvp_worldcup_win"), false);

const worldCupHardcoreWin = regularMatchAchievementAwards(
  state("worldcup-hardcore", result("you", { you: 1, opp: 0 })),
  player("you"),
  player("opp"),
);
assert.ok(worldCupHardcoreWin?.ids.includes("pvp_win"));
assert.ok(worldCupHardcoreWin?.ids.includes("pvp_hardcore_win"));
assert.ok(worldCupHardcoreWin?.ids.includes("pvp_worldcup_win"));
assert.ok(worldCupHardcoreWin?.ids.includes("pvp_worldcup_hardcore_win"));
assert.ok(worldCupHardcoreWin?.ids.includes("pvp_clean_sheet"));
assert.equal(worldCupHardcoreWin?.ids.includes("pvp_club_win"), false);

const penaltyWin = regularMatchAchievementAwards(
  state("worldcup", result("you", { you: 1, opp: 1 }, { you: 5, opp: 4 })),
  player("you"),
  player("opp"),
);
assert.ok(penaltyWin?.ids.includes("pvp_penalty_win"));
assert.equal(penaltyWin?.xp, 60);

const achievementText = ACHIEVEMENTS.map((a) => `${a.title} ${a.description}`).join(" ");
assert.equal(/pica/i.test(achievementText), false);

console.log("[achievement-rules-test] ok");
