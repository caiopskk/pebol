import type { Mentality } from "./types.js";

export interface MentalityDef {
  id: Mentality;
  name: string;
  desc: string;
  attackMod: number;  // multiplier applied to attack strength
  defenseMod: number; // multiplier applied to defense strength
}

export const MENTALITIES: MentalityDef[] = [
  {
    id: "aura",
    name: "Aura (Agressiva)",
    desc: "Vai pra cima: +15% de ataque, mas -10% de defesa.",
    attackMod: 1.15,
    defenseMod: 0.9,
  },
  {
    id: "equilibrada",
    name: "Equilibrada",
    desc: "Sem bônus nem penalidades.",
    attackMod: 1.0,
    defenseMod: 1.0,
  },
  {
    id: "retranca",
    name: "Retranca",
    desc: "Fecha o jogo: +15% de defesa, mas -10% de ataque.",
    attackMod: 0.9,
    defenseMod: 1.15,
  },
];

export function getMentality(id: Mentality): MentalityDef {
  return MENTALITIES.find((m) => m.id === id) ?? MENTALITIES[1];
}
