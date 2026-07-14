import type { GameMode } from "./types.js";

export const HARDCORE_AI_SCALE = 1.025;

export function isWorldCupMode(mode: GameMode): boolean {
  return mode === "worldcup" || mode === "worldcup-hardcore";
}

export function isHardcoreMode(mode: GameMode): boolean {
  return mode === "hardcore" || mode === "worldcup-hardcore";
}

export function gameModeLabel(mode: GameMode): string {
  if (mode === "worldcup-hardcore") return "Seleções · Hardcore";
  if (mode === "worldcup") return "Seleções · Clássico";
  if (mode === "hardcore") return "Clubes · Hardcore";
  return "Clubes · Clássico";
}

export function gameModeStrengthScale(mode: GameMode, isAI: boolean): number {
  return isAI && isHardcoreMode(mode) ? HARDCORE_AI_SCALE : 1;
}
