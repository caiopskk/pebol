import assert from "node:assert/strict";
import {
  attackFocusReport,
  computeStrength,
  effectiveRating,
  playerPositionPenalty,
  positionPenalty,
  simulateGauntletMatch,
  type SimInput,
} from "../../shared/engine.js";
import { FORMATIONS, groupOf } from "../../shared/formations.js";
import type {
  AttackFocus,
  Mentality,
  Player,
  Position,
  SquadPick,
} from "../../shared/types.js";

const POSITIONS: Position[] = [
  "GK",
  "RB",
  "LB",
  "CB",
  "RWB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
];
const MENTALITIES: Mentality[] = [
  "aura",
  "equilibrada",
  "retranca",
  "pressao",
  "posse",
  "contra_ataque",
];
const FOCI: AttackFocus[] = ["equilibrado", "lados", "meio"];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function one<T>(rand: () => number, values: readonly T[]): T {
  return values[Math.floor(rand() * values.length)];
}

function finiteRating(n: number): boolean {
  return Number.isFinite(n) && n >= 40 && n <= 120;
}

function randomPlayer(
  rand: () => number,
  pos: Position,
  idx: number,
  overrides: Partial<Player> = {},
): Player {
  const rating = overrides.rating ?? int(rand, 60, 99);
  return {
    name: `Jogador ${idx}`,
    pos,
    rating,
    pac: int(rand, 1, 99),
    sho: int(rand, 1, 99),
    pas: int(rand, 1, 99),
    dri: int(rand, 1, 99),
    def: int(rand, 1, 99),
    phy: int(rand, 1, 99),
    ...overrides,
  };
}

function randomInput(rand: () => number, id: string): SimInput {
  const formation = one(rand, FORMATIONS);
  const picks: SquadPick[] = formation.slots.map((slot, idx) => {
    const naturalPos =
      rand() < 0.78
        ? slot.pos
        : one(
            rand,
            POSITIONS.filter((p) => groupOf(p) === groupOf(slot.pos)),
          );
    const player = randomPlayer(rand, naturalPos, idx);
    return {
      slotId: slot.id,
      player,
      fromTeamId: id,
      effectiveRating: effectiveRating(player, slot.pos),
    };
  });
  return {
    id,
    name: id,
    picks,
    formationId: formation.id,
    mentality: one(rand, MENTALITIES),
    attackFocus: one(rand, FOCI),
  };
}

function strengthIsSane(strength: ReturnType<typeof computeStrength>): void {
  assert.ok(finiteRating(strength.attack), `invalid attack ${strength.attack}`);
  assert.ok(finiteRating(strength.midfield), `invalid midfield ${strength.midfield}`);
  assert.ok(finiteRating(strength.defense), `invalid defense ${strength.defense}`);
  assert.ok(finiteRating(strength.overall), `invalid overall ${strength.overall}`);
}

function makePick(slotId: string, slotPos: Position, player: Player): SquadPick {
  return {
    slotId,
    player,
    fromTeamId: "probe",
    effectiveRating: effectiveRating(player, slotPos),
  };
}

function assertPositionPenaltyProperties(): void {
  for (const pos of POSITIONS) {
    assert.equal(positionPenalty(pos, pos), 0);
    const player = randomPlayer(rng(10), pos, 0, { rating: 88 });
    assert.equal(effectiveRating(player, pos), 88);
  }

  const cb = randomPlayer(rng(11), "CB", 1, { rating: 88 });
  assert.equal(playerPositionPenalty(cb, "LB"), 3);
  assert.equal(playerPositionPenalty(cb, "CM"), 10);
  assert.equal(playerPositionPenalty(cb, "ST"), 22);
  assert.equal(playerPositionPenalty(cb, "GK"), 22);
}

function assertAttributeInfluence(): void {
  const formationId = "4-3-3";
  const formation = FORMATIONS.find((f) => f.id === formationId)!;
  const base = formation.slots.map((slot, idx) =>
    makePick(
      slot.id,
      slot.pos,
      randomPlayer(rng(20 + idx), slot.pos, idx, {
        rating: 80,
        pac: 80,
        sho: 80,
        pas: 80,
        dri: 80,
        def: 80,
        phy: 80,
      }),
    ),
  );

  const lowSho = base.map((pick) =>
    pick.slotId === "ST"
      ? makePick(pick.slotId, "ST", { ...pick.player, sho: 35, name: "Finalizador baixo" })
      : pick,
  );
  const highSho = base.map((pick) =>
    pick.slotId === "ST"
      ? makePick(pick.slotId, "ST", { ...pick.player, sho: 99, name: "Finalizador alto" })
      : pick,
  );
  assert.ok(
    computeStrength(highSho, formationId).attack >
      computeStrength(lowSho, formationId).attack,
    "higher striker shooting should improve attack strength",
  );

  const lowDef = base.map((pick) =>
    pick.slotId === "CB1"
      ? makePick(pick.slotId, "CB", { ...pick.player, def: 35, name: "Defensor baixo" })
      : pick,
  );
  const highDef = base.map((pick) =>
    pick.slotId === "CB1"
      ? makePick(pick.slotId, "CB", { ...pick.player, def: 99, name: "Defensor alto" })
      : pick,
  );
  assert.ok(
    computeStrength(highDef, formationId).defense >
      computeStrength(lowDef, formationId).defense,
    "higher center-back defending should improve defense strength",
  );
}

function assertAttackFocusProperties(): void {
  const formation = FORMATIONS.find((f) => f.id === "4-3-3")!;
  const picks = formation.slots.map((slot, idx) => {
    const wide = ["LB", "RB", "LW", "RW"].includes(slot.id);
    const player = randomPlayer(rng(50 + idx), slot.pos, idx, {
      rating: 82,
      pac: wide ? 99 : 70,
      sho: wide ? 96 : 70,
      pas: wide ? 92 : 70,
      dri: wide ? 99 : 70,
      def: 70,
      phy: 70,
    });
    return makePick(slot.id, slot.pos, player);
  });
  const report = attackFocusReport(picks);
  assert.equal(report.best, "lados");
  assert.ok(report.wide != null && report.central != null && report.wide > report.central);
}

function assertSimulationProperties(): void {
  const rand = rng(1234);
  for (let i = 0; i < 300; i++) {
    const home = randomInput(rand, `home-${i}`);
    const away = randomInput(rand, `away-${i}`);
    strengthIsSane(computeStrength(home.picks, home.formationId));
    strengthIsSane(computeStrength(away.picks, away.formationId));

    const result = simulateGauntletMatch(home, away, true);
    assert.ok(result.timeline.length >= 90, "timeline should contain live events");
    for (let j = 1; j < result.timeline.length; j++) {
      assert.ok(
        result.timeline[j].minute >= result.timeline[j - 1].minute,
        "timeline must be ordered by minute",
      );
    }
    assert.ok(result.youGoals >= 0 && result.oppGoals >= 0);
    assert.ok(["win", "draw", "loss"].includes(result.outcome));
    if (result.outcome === "win") assert.equal(result.winnerId, home.id);
    if (result.outcome === "loss") assert.equal(result.winnerId, away.id);
    if (result.shootout) {
      assert.ok(result.penaltyScore);
      assert.ok(result.shootout.length >= 6);
      for (const kick of result.shootout) {
        assert.ok(kick.taker.length > 0);
      }
    }
  }
}

assertPositionPenaltyProperties();
assertAttributeInfluence();
assertAttackFocusProperties();
assertSimulationProperties();

console.log("[engine-property-test] ok");
