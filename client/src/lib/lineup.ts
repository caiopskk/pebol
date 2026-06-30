import type { Player, PlayerPublic } from "../../../shared/types.js";
import { effectiveRating } from "../../../shared/engine.js";
import { getTeam } from "../../../shared/data/teams.js";
import { getFormation, posLabel } from "../../../shared/formations.js";
import type { PitchSlot } from "../components/Pitch.js";

export interface BuildPitchOpts {
  forceHideRatings?: boolean;
  forceShowRatings?: boolean;
  showPos?: boolean;
  openSlotIds?: Set<string>;
  selectedSubId?: string | null;
  hideRatingsGlobal?: boolean;
}

export function lastName(full: string): string {
  const parts = full.split(" ");
  return parts.length > 1 && parts[parts.length - 1].length > 2
    ? parts[parts.length - 1]
    : full;
}

export function buildPitchSlots(
  formation: NonNullable<ReturnType<typeof getFormation>>,
  picks: PlayerPublic["picks"],
  opts: BuildPitchOpts = {},
): PitchSlot[] {
  const bySlot = new Map(picks.map((p) => [p.slotId, p]));
  const hideRating = opts.forceShowRatings
    ? false
    : (opts.forceHideRatings ?? !!opts.hideRatingsGlobal);
  return formation.slots.map((slot) => {
    const pick = bySlot.get(slot.id);
    const filled = !!pick;
    return {
      id: slot.id,
      pos: slot.pos,
      x: slot.x,
      y: slot.y,
      label: filled ? lastName(pick!.player.name) : posLabel(slot.pos),
      filled,
      rating: pick?.effectiveRating,
      penalty: !!pick && pick.effectiveRating < pick.player.rating,
      hideRating,
      showPos: opts.showPos,
      open: opts.openSlotIds?.has(slot.id) ?? false,
      selectedSub: filled && opts.selectedSubId === slot.id,
    };
  });
}

export function reassignPicksToFormation(
  player: PlayerPublic,
  formationId: string,
) {
  const formation = getFormation(formationId);
  if (!formation || player.picks.length !== formation.slots.length) return null;

  const before =
    player.picks.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, player.picks.length);
  const remaining = [...player.picks];
  const next = formation.slots.map((slot) => {
    let bestIdx = 0;
    let bestRating = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const rating = effectiveRating(remaining[i].player, slot.pos);
      if (rating > bestRating) {
        bestRating = rating;
        bestIdx = i;
      }
    }
    const [pick] = remaining.splice(bestIdx, 1);
    return {
      ...pick,
      slotId: slot.id,
      effectiveRating: effectiveRating(pick.player, slot.pos),
    };
  });
  player.formationId = formationId;
  player.picks = next;
  const after =
    next.reduce((sum, pick) => sum + pick.effectiveRating, 0) /
    Math.max(1, next.length);
  return Math.round((after - before) * 10) / 10;
}

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function buildIntervalBench(
  player: PlayerPublic,
): Array<Player & { fromTeamId: string }> {
  const pickedNames = new Set(player.picks.map((pick) => pick.player.name));
  const byName = new Map<string, Player & { fromTeamId: string }>();
  for (const pick of player.picks) {
    const team = getTeam(pick.fromTeamId);
    for (const reserve of team?.bench ?? []) {
      if (pickedNames.has(reserve.name)) continue;
      byName.set(`${pick.fromTeamId}:${reserve.name}`, {
        ...reserve,
        fromTeamId: pick.fromTeamId,
      });
    }
  }
  return shuffled([...byName.values()]).slice(0, 12);
}

export function applyIntervalSubstitution(
  player: PlayerPublic,
  outSlotId: string,
  reserveName: string,
  bench: Array<Player & { fromTeamId: string }>,
) {
  const reserve = bench.find((p) => p.name === reserveName);
  const pickIdx = player.picks.findIndex((pick) => pick.slotId === outSlotId);
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const slot = formation?.slots.find((s) => s.id === outSlotId);
  if (!reserve || pickIdx < 0 || !slot) return null;

  const outgoing = player.picks[pickIdx];
  const nextRating = effectiveRating(reserve, slot.pos);
  player.picks[pickIdx] = {
    ...outgoing,
    player: reserve,
    fromTeamId: reserve.fromTeamId,
    effectiveRating: nextRating,
  };
  return {
    out: outgoing.player.name,
    in: reserve.name,
    delta: nextRating - outgoing.effectiveRating,
  };
}

export function swapLineupSlots(
  player: PlayerPublic,
  slotA: string,
  slotB: string,
) {
  if (slotA === slotB) return null;
  const formation = player.formationId
    ? getFormation(player.formationId)
    : null;
  const pickA = player.picks.find((pick) => pick.slotId === slotA);
  const pickB = player.picks.find((pick) => pick.slotId === slotB);
  const formationSlotA = formation?.slots.find((slot) => slot.id === slotA);
  const formationSlotB = formation?.slots.find((slot) => slot.id === slotB);
  if (!pickA || !pickB || !formationSlotA || !formationSlotB) return null;

  const oldTotal = pickA.effectiveRating + pickB.effectiveRating;
  const nextA = {
    ...pickB,
    slotId: slotA,
    effectiveRating: effectiveRating(pickB.player, formationSlotA.pos),
  };
  const nextB = {
    ...pickA,
    slotId: slotB,
    effectiveRating: effectiveRating(pickA.player, formationSlotB.pos),
  };
  player.picks = player.picks.map((pick) =>
    pick.slotId === slotA ? nextA : pick.slotId === slotB ? nextB : pick,
  );
  const delta = nextA.effectiveRating + nextB.effectiveRating - oldTotal;
  return {
    a: pickA.player.name,
    b: pickB.player.name,
    delta,
  };
}
