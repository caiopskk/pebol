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
  GauntletResult,
  MatchEvent,
  MatchResult,
  PlayerPublic,
  RoomState,
  ShootoutKick,
  SquadPick,
} from "../../shared/types.js";
import {
  draftAchievementIds,
  regularMatchAchievementAwards,
} from "./lib/achievementRules.js";
import { campaignMatchAchievementIds } from "./lib/campaignData.js";

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

// ---- campaignMatchAchievementIds (World Cup gauntlet matches) ----

function goalEvent(
  minute: number,
  side: "home" | "away",
  scorer: string,
  assist?: string,
): MatchEvent {
  return { minute, type: "goal", side, text: "Gol.", player: scorer, assist };
}

function redCardEvent(minute: number, side: "home" | "away", who: string): MatchEvent {
  return { minute, type: "card", side, card: "red", text: "Vermelho.", player: who };
}

function gauntletResult(opts: {
  youGoals: number;
  oppGoals: number;
  outcome: "win" | "draw" | "loss";
  timeline: MatchEvent[];
  shootout?: ShootoutKick[] | null;
  penaltyScore?: Record<string, number> | null;
  wentToExtraTime?: boolean;
}): GauntletResult {
  return {
    youId: "you",
    oppId: "opp",
    oppName: "Rival",
    timeline: opts.timeline,
    youGoals: opts.youGoals,
    oppGoals: opts.oppGoals,
    outcome: opts.outcome,
    shootout: opts.shootout ?? null,
    penaltyScore: opts.penaltyScore ?? null,
    winnerId: opts.outcome === "win" ? "you" : opts.outcome === "loss" ? "opp" : null,
    wentToExtraTime: opts.wentToExtraTime ?? false,
  };
}

const bigCleanSheetWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 4,
    oppGoals: 0,
    outcome: "win",
    timeline: [
      goalEvent(10, "home", "Artilheiro", "Garçom"),
      goalEvent(25, "home", "Artilheiro", "Garçom"),
      goalEvent(60, "home", "Artilheiro", "Outro"),
      goalEvent(70, "home", "Companheiro", "Garçom"),
    ],
  }),
);
assert.ok(bigCleanSheetWin.includes("first_goal"));
assert.ok(bigCleanSheetWin.includes("first_win"));
assert.ok(bigCleanSheetWin.includes("clean_sheet"));
assert.ok(bigCleanSheetWin.includes("hat_trick"));
assert.ok(bigCleanSheetWin.includes("assist_master"));
assert.ok(bigCleanSheetWin.includes("big_win"));
assert.equal(bigCleanSheetWin.includes("comeback_win"), false);
assert.equal(bigCleanSheetWin.includes("red_card_win"), false);

const comebackWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 2,
    oppGoals: 1,
    outcome: "win",
    timeline: [
      goalEvent(20, "away", "Rival 9"),
      goalEvent(60, "home", "Camisa 10", "Meião"),
      goalEvent(75, "home", "Camisa 9", "Meião"),
    ],
  }),
);
assert.ok(comebackWin.includes("comeback_win"));
assert.equal(comebackWin.includes("clean_sheet"), false);

const noComebackWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 2,
    oppGoals: 1,
    outcome: "win",
    timeline: [
      goalEvent(20, "home", "Camisa 10", "Meião"),
      goalEvent(60, "away", "Rival 9"),
      goalEvent(75, "home", "Camisa 9", "Meião"),
    ],
  }),
);
assert.equal(
  noComebackWin.includes("comeback_win"),
  false,
  "leading at halftime should not count as a comeback",
);

const redCardWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 1,
    oppGoals: 0,
    outcome: "win",
    timeline: [redCardEvent(30, "home", "Zagueiro"), goalEvent(80, "home", "Atacante", "Meia")],
  }),
);
assert.ok(redCardWin.includes("red_card_win"));

const oppRedCardWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 1,
    oppGoals: 0,
    outcome: "win",
    timeline: [redCardEvent(30, "away", "Rival zagueiro"), goalEvent(80, "home", "Atacante", "Meia")],
  }),
);
assert.equal(
  oppRedCardWin.includes("red_card_win"),
  false,
  "the opponent being sent off should not award your red-card-win achievement",
);

const campaignPenaltyWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 1,
    oppGoals: 1,
    outcome: "win",
    timeline: [goalEvent(40, "home", "Cobrador"), goalEvent(70, "away", "Rival")],
    shootout: [],
    penaltyScore: { you: 5, opp: 4 },
  }),
);
assert.ok(campaignPenaltyWin.includes("penalty_win"));

const campaignPenaltyLoss = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 1,
    oppGoals: 1,
    outcome: "loss",
    timeline: [goalEvent(40, "home", "Cobrador"), goalEvent(70, "away", "Rival")],
    shootout: [],
    penaltyScore: { you: 4, opp: 5 },
  }),
);
assert.equal(
  campaignPenaltyLoss.includes("penalty_win"),
  false,
  "losing a shootout must not award the penalty-win achievement",
);

// extra-time goals (minute > 90) must still be picked up by the goal/assist/clean-sheet tallies
const extraTimeWin = campaignMatchAchievementIds(
  gauntletResult({
    youGoals: 2,
    oppGoals: 0,
    outcome: "win",
    wentToExtraTime: true,
    timeline: [
      goalEvent(55, "home", "Titular", "Armador"),
      goalEvent(112, "home", "Reserva", "Armador"),
    ],
  }),
);
assert.ok(extraTimeWin.includes("first_win"));
assert.ok(extraTimeWin.includes("clean_sheet"));
assert.equal(extraTimeWin.includes("hat_trick"), false);

console.log("[achievement-rules-test] ok");
