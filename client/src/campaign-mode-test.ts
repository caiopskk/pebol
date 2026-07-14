import assert from "node:assert/strict";
import {
  playerPositions,
  simInputFromTeam,
  simulateGauntletMatch,
  wcOpponentTactics,
} from "../../shared/engine.js";
import { getFormation, groupOf } from "../../shared/formations.js";
import { WC_LADDER, wcOpponentTeam } from "../../shared/data/worldcup.js";
import type { Player } from "../../shared/types.js";
import type { CampaignState, CupGroupRow } from "./campaignTypes.js";
import {
  campaignOpenSlots,
  campaignSelectable,
  drawCampaignTeam,
  placeCampaignPlayer,
  relocateCampaignPick,
  rerollCampaignTeam,
  startCampaignDraft,
} from "./lib/campaignDraftLogic.js";
import {
  bestThirdQualifies,
  campaignQualificationLabel,
  campaignRank,
  campaignStageLabel,
  campaignStatusData,
  groupGoalDiff,
  groupRow,
  groupTableSorted,
  recordGroupMatch,
  setupCampaignGroup,
  setupKnockoutPath,
  teamAvg,
} from "./lib/campaignData.js";
import { createInitialCampaignState } from "./lib/campaignStateFactory.js";

function seeded(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function assertCampaignModeSetup(): void {
  const idle = createInitialCampaignState();
  assert.equal(idle.phase, "setup");
  assert.equal(rerollCampaignTeam(idle), "wrong-phase");

  for (const mode of ["normal", "hardcore"] as const) {
    const state = createInitialCampaignState();
    state.mode = mode;
    assert.equal(startCampaignDraft(state), true);
    assert.equal(state.phase, "draft");
    assert.equal(state.rerollsRemaining, mode === "hardcore" ? 3 : 5);
    assert.ok(state.currentTeam);
    assert.ok(campaignSelectable(state).size > 0);

    const firstId = state.currentTeam!.id;
    assert.equal(rerollCampaignTeam(state), "ok");
    assert.equal(state.rerollsRemaining, (mode === "hardcore" ? 3 : 5) - 1);
    assert.notEqual(state.currentTeam!.id, firstId);
    state.rerollsRemaining = 0;
    const exhaustedId = state.currentTeam!.id;
    assert.equal(rerollCampaignTeam(state), "exhausted");
    assert.equal(state.currentTeam!.id, exhaustedId);
  }
}

function compatible(player: Player, slotPos: Player["pos"]): boolean {
  return playerPositions(player).some((position) => groupOf(position) === groupOf(slotPos));
}

function buildCampaignSquad(): CampaignState {
  const state = createInitialCampaignState();
  assert.equal(startCampaignDraft(state), true);
  const formation = getFormation(state.formationId)!;

  const incompatiblePlayer = state.currentTeam!.players.find((player) =>
    formation.slots.some((slot) => !compatible(player, slot.pos))
  )!;
  const incompatibleSlot = formation.slots.find((slot) => !compatible(incompatiblePlayer, slot.pos))!;
  assert.equal(placeCampaignPlayer(state, incompatibleSlot.id, incompatiblePlayer), false, "campaign draft must reject cross-sector placement");

  while (state.picks.length < 11) {
    const selectable = campaignSelectable(state);
    const open = campaignOpenSlots(state);
    const candidate = state.currentTeam!.players.find((player) => selectable.has(player.name) && open.some((slot) => compatible(player, slot.pos)));
    assert.ok(candidate, "drawn campaign team should expose a selectable player");
    const slot = open.find((entry) => compatible(candidate, entry.pos))!;
    assert.equal(placeCampaignPlayer(state, slot.id, candidate), true);
    if (state.picks.length < 11) assert.equal(drawCampaignTeam(state), true);
  }

  assert.equal(state.picks.length, 11);
  assert.equal(new Set(state.picks.map((pick) => pick.slotId)).size, 11);
  assert.equal(new Set(state.picks.map((pick) => pick.fromTeamId)).size, 11, "each campaign pick should consume a new national team");
  assert.ok(state.picks.every((pick) => pick.effectiveRating >= 40 && pick.effectiveRating <= 99));
  assert.equal(campaignOpenSlots(state).length, 0);

  const sameSector = state.picks.find((pick, index) =>
    state.picks.some((other, otherIndex) => otherIndex !== index && groupOf(other.player.pos) === groupOf(pick.player.pos))
  )!;
  const sameSectorTarget = state.picks.find((pick) => pick !== sameSector && groupOf(pick.player.pos) === groupOf(sameSector.player.pos))!;
  assert.equal(relocateCampaignPick(state, sameSector.slotId, sameSectorTarget.slotId), true, "same-sector picks should be swappable");
  const crossSectorTarget = state.picks.find((pick) => groupOf(pick.player.pos) !== groupOf(sameSector.player.pos))!;
  const beforeSlots = state.picks.map((pick) => pick.slotId);
  assert.equal(relocateCampaignPick(state, sameSectorTarget.slotId, crossSectorTarget.slotId), false, "cross-sector relocation should be blocked");
  assert.deepEqual(state.picks.map((pick) => pick.slotId), beforeSlots, "a rejected relocation must not mutate the squad");
  return state;
}

function assertGroupStage(state: CampaignState): void {
  setupCampaignGroup(state);
  assert.equal(state.groupTeams.length, 3);
  assert.equal(new Set(state.groupTeams.map((team) => team.id)).size, 3);
  assert.equal(state.groupTable.length, 4);
  const [a, b, c] = state.groupTeams;
  recordGroupMatch(state.groupTable, "you", a.id, 2, 0);
  recordGroupMatch(state.groupTable, b.id, c.id, 1, 1);
  recordGroupMatch(state.groupTable, "you", b.id, 0, 0);
  recordGroupMatch(state.groupTable, a.id, c.id, 1, 0);
  recordGroupMatch(state.groupTable, "you", c.id, 1, 2);
  recordGroupMatch(state.groupTable, a.id, b.id, 0, 1);
  assert.ok(state.groupTable.every((row) => row.played === 3));
  assert.ok(state.groupTable.every((row) => row.wins + row.draws + row.losses === row.played));
  const totalPoints = state.groupTable.reduce((sum, row) => sum + row.points, 0);
  assert.ok(totalPoints >= 12 && totalPoints <= 18, "six group fixtures must distribute two or three points each");
  assert.equal(campaignRank(state), groupTableSorted(state.groupTable).findIndex((row) => row.id === "you") + 1);
  assert.equal(campaignStatusData(state).kind, "group");

  const thirdWithFour: CupGroupRow = { ...groupRow({ id: "you", name: "Seu time", season: "" }), played: 3, wins: 1, draws: 1, losses: 1, gf: 3, ga: 3, points: 4 };
  const thirdWithBadThree = { ...thirdWithFour, points: 3, draws: 0, losses: 2, gf: 2, ga: 4 };
  const thirdWithGoodThree = { ...thirdWithBadThree, gf: 4, ga: 4 };
  assert.equal(bestThirdQualifies(thirdWithFour), true);
  assert.equal(bestThirdQualifies(thirdWithGoodThree), true);
  assert.equal(bestThirdQualifies(thirdWithBadThree), false);
  assert.equal(groupGoalDiff(thirdWithBadThree), -2);

  state.groupTable = [
    { ...thirdWithFour, id: "leader", name: "Líder", points: 7 },
    { ...thirdWithFour, id: "runner", name: "Vice", points: 6 },
    thirdWithFour,
    { ...thirdWithFour, id: "last", name: "Lanterna", points: 1 },
  ];
  assert.equal(campaignQualificationLabel(state), "3º colocado entre os 8 melhores terceiros");
}

function assertKnockoutAndSimulation(state: CampaignState): void {
  setupKnockoutPath(state);
  assert.equal(state.knockoutPath.length, 5);
  assert.equal(new Set(state.knockoutPath.map((team) => team.id)).size, 5);
  assert.equal(campaignStageLabel(0), WC_LADDER[0].label);
  assert.equal(campaignStageLabel(7), "A Grande Final");

  const you = {
    id: "you",
    name: "Seu time",
    picks: state.picks,
    formationId: state.formationId,
    mentality: state.mentality,
    attackFocus: state.attackFocus,
  };
  for (let round = 0; round < WC_LADDER.length; round++) {
    const opponent = wcOpponentTeam(round, seeded(100 + round));
    const tactics = wcOpponentTactics(opponent);
    const opponentInput = {
      ...simInputFromTeam(opponent, tactics.formationId, tactics.mentality),
      attackFocus: tactics.attackFocus,
    };
    const result = simulateGauntletMatch(you, opponentInput, round >= 3);
    assert.equal(result.timeline[0]?.type, "kickoff");
    assert.equal(result.timeline.at(-1)?.type, "fulltime");
    if (round < 3) {
      assert.equal(result.wentToExtraTime, false);
      assert.equal(result.shootout, null);
      assert.ok(result.timeline.every((event) => event.minute <= 90));
    } else {
      assert.notEqual(result.outcome, "draw");
      assert.ok(result.winnerId);
    }
  }

  const averageByRound = WC_LADDER.map((_, round) => {
    const random = seeded(1000 + round);
    const samples = Array.from({ length: 40 }, () => teamAvg(wcOpponentTeam(round, random)));
    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  });
  const groupAverage = averageByRound.slice(0, 3).reduce((sum, value) => sum + value, 0) / 3;
  const lateAverage = averageByRound.slice(5).reduce((sum, value) => sum + value, 0) / 3;
  assert.ok(lateAverage > groupAverage + 7.5, `campaign difficulty should rise materially (${groupAverage.toFixed(1)} -> ${lateAverage.toFixed(1)})`);
  const final = wcOpponentTeam(7, seeded(77));
  assert.ok(final.players.every((player) => player.rating <= 99));
  assert.ok(teamAvg(final) >= 90, "the final opponent should remain an elite side after the capped buff");

  state.round = 3;
  state.groupQualified = true;
  assert.equal(campaignStatusData(state).kind, "knockout");
}

assertCampaignModeSetup();
const campaign = buildCampaignSquad();
assertGroupStage(campaign);
assertKnockoutAndSimulation(campaign);

console.log("[campaign-mode-test] ok - draft, grupos, classificação e mata-mata");
