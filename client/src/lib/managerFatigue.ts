import type { ManagerPlayer } from "../../../shared/types.js";

function clampRating(value: number): number {
  return Math.max(40, Math.min(99, Math.round(value)));
}

export function managerFitnessPenalty(fitness: number): number {
  if (fitness >= 90) return 0;
  return Math.ceil((90 - Math.max(35, fitness)) / 5);
}

export function managerMatchRating(player: ManagerPlayer): number {
  const sharpnessMod = player.sharpness >= 85 ? 1 : player.sharpness < 45 ? -2 : player.sharpness < 60 ? -1 : 0;
  const moraleMod = player.morale >= 85 ? 1 : player.morale < 42 ? -1 : 0;
  return clampRating(player.rating - managerFitnessPenalty(player.fitness) + sharpnessMod + moraleMod);
}

export function managerConditionedPlayer<T extends ManagerPlayer>(player: T): T {
  return { ...player, rating: managerMatchRating(player) };
}

export function managerFitnessLabel(fitness: number): string {
  if (fitness >= 90) return "Pronto";
  if (fitness >= 80) return "Desgaste leve";
  if (fitness >= 70) return "Cansado";
  return "Exausto";
}

export function managerFitnessTone(fitness: number): string {
  if (fitness >= 90) return "text-pebol-accent";
  if (fitness >= 80) return "text-pebol-gold";
  if (fitness >= 70) return "text-orange-300";
  return "text-red-300";
}
