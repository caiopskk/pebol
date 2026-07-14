import type {
  Formation,
  ManagerPlayer,
  ManagerStanding,
  SquadPick,
} from "../../../shared/types.js";
import { effectiveRating } from "../../../shared/engine.js";
import type { PitchSlot } from "../components/Pitch.js";
import { managerConditionedPlayer } from "./managerFatigue.js";

export function moneyLabel(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ratingAvg(players: Array<{ rating: number }>): number {
  if (!players.length) return 0;
  return Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length);
}

export function managerRecordLabel(standing: ManagerStanding): string {
  return `${standing.wins}V ${standing.draws}E ${standing.losses}D`;
}

export function managerPitchSlots(
  formation: Formation,
  squad: ManagerPlayer[],
  selectedPlayerId: string | null,
): PitchSlot[] {
  const bySlot = new Map(
    squad
      .filter((p) => p.isStarter && p.lineupSlotId)
      .map((p) => [p.lineupSlotId!, p]),
  );
  return formation.slots.map((slot) => {
    const player = bySlot.get(slot.id);
    const matchPlayer = player ? managerConditionedPlayer(player) : undefined;
    const rating = matchPlayer ? effectiveRating(matchPlayer, slot.pos) : undefined;
    return {
      id: slot.id,
      pos: slot.pos,
      x: slot.x,
      y: slot.y,
      filled: !!player,
      label: player?.name.split(" ").at(-1) ?? slot.id,
      rating,
      penalty: matchPlayer ? rating !== matchPlayer.rating : false,
      showPos: true,
      open: !!selectedPlayerId && !player,
      selectedSub: player?.id === selectedPlayerId,
    };
  });
}

export function managerPicks(formation: Formation, squad: ManagerPlayer[]): SquadPick[] {
  return formation.slots.flatMap((slot) => {
    const player = squad.find((p) => p.isStarter && p.lineupSlotId === slot.id);
    if (!player) return [];
    return [{
      slotId: slot.id,
      player,
      fromTeamId: player.teamId,
      effectiveRating: effectiveRating(player, slot.pos),
    }];
  });
}
