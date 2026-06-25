import assert from "node:assert/strict";
import {
  computeStrength,
  effectiveRating,
  simulateGauntletMatch,
  type SimInput,
} from "../../shared/engine.js";
import { FORMATIONS } from "../../shared/formations.js";
import type { Player, Position, SquadPick } from "../../shared/types.js";

const RUNS = 1200;
const FORMATION_ID = "4-3-3";

function player(pos: Position, idx: number, rating: number): Player {
  return {
    name: `${rating} OVR ${idx}`,
    pos,
    rating,
    pac: rating,
    sho: rating,
    pas: rating,
    dri: rating,
    def: rating,
    phy: rating,
  };
}

function side(id: string, rating: number): SimInput {
  const formation = FORMATIONS.find((f) => f.id === FORMATION_ID)!;
  const picks: SquadPick[] = formation.slots.map((slot, idx) => {
    const p = player(slot.pos, idx, rating);
    return {
      slotId: slot.id,
      player: p,
      fromTeamId: id,
      effectiveRating: effectiveRating(p, slot.pos),
    };
  });
  return {
    id,
    name: id,
    picks,
    formationId: formation.id,
    mentality: "equilibrada",
    attackFocus: "equilibrado",
  };
}

function rate(n: number, total: number): number {
  return Math.round((n / total) * 1000) / 10;
}

function assertStrengthGap(): void {
  const strong = computeStrength(side("strong", 92).picks, FORMATION_ID);
  const weak = computeStrength(side("weak", 72).picks, FORMATION_ID);
  assert.ok(strong.attack > weak.attack + 15, "strong team should have a large attack edge");
  assert.ok(strong.midfield > weak.midfield + 15, "strong team should have a large midfield edge");
  assert.ok(strong.defense > weak.defense + 15, "strong team should have a large defense edge");
}

function assertStrongTeamWinsMore(): void {
  const strong = side("strong", 92);
  const weak = side("weak", 72);
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (let i = 0; i < RUNS; i++) {
    const result = simulateGauntletMatch(strong, weak, false);
    if (result.outcome === "win") wins++;
    else if (result.outcome === "loss") losses++;
    else draws++;
  }

  const winRate = wins / RUNS;
  const lossRate = losses / RUNS;
  console.log(
    `[engine-balance-test] strong vs weak: ${rate(wins, RUNS)}% win, ${rate(draws, RUNS)}% draw, ${rate(losses, RUNS)}% loss`,
  );

  assert.ok(
    winRate >= 0.82,
    `strong team win rate too low: ${rate(wins, RUNS)}%`,
  );
  assert.ok(
    lossRate <= 0.06,
    `strong team loss rate too high: ${rate(losses, RUNS)}%`,
  );
}

function assertMirrorMatchIsBalanced(): void {
  const a = side("a", 84);
  const b = side("b", 84);
  let wins = 0;
  let losses = 0;

  for (let i = 0; i < RUNS; i++) {
    const result = simulateGauntletMatch(a, b, false);
    if (result.outcome === "win") wins++;
    else if (result.outcome === "loss") losses++;
  }

  const decided = wins + losses;
  const decidedWinRate = decided ? wins / decided : 0.5;
  console.log(
    `[engine-balance-test] mirror decided games: ${rate(wins, decided || 1)}% / ${rate(losses, decided || 1)}%`,
  );

  assert.ok(
    decidedWinRate >= 0.43 && decidedWinRate <= 0.57,
    `mirror match is biased: ${rate(wins, decided || 1)}% decided wins for side A`,
  );
}

assertStrengthGap();
assertStrongTeamWinsMore();
assertMirrorMatchIsBalanced();

console.log("[engine-balance-test] ok");
