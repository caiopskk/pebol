import type { Mentality } from "./types.js";

export interface MentalityDef {
  id: Mentality;
  name: string;
  desc: string;
  attackMod: number; // multiplier applied to attack strength
  defenseMod: number; // multiplier applied to defense strength
}

export const MENTALITIES: MentalityDef[] = [
  {
    id: "aura",
    name: "Agressivo",
    desc: "Vai pra cima: +10% de ataque, mas -8% de defesa.",
    attackMod: 1.1,
    defenseMod: 0.92,
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
    desc: "Fecha o jogo: +10% de defesa, mas -8% de ataque.",
    attackMod: 0.92,
    defenseMod: 1.1,
  },
  {
    id: "pressao",
    name: "Marçação pressão",
    desc: "Rouba bola no campo rival: +7% ataque, -5% defesa.",
    attackMod: 1.07,
    defenseMod: 0.95,
  },
  {
    id: "posse",
    name: "Posse de Bola",
    desc: "Controla o ritmo: +4% ataque e +4% defesa.",
    attackMod: 1.04,
    defenseMod: 1.04,
  },
  {
    id: "contra_ataque",
    name: "Contra-ataque",
    desc: "Bloco baixo e saída rápida: +5% ataque e +7% defesa.",
    attackMod: 1.05,
    defenseMod: 1.07,
  },
];

export function getMentality(id: Mentality): MentalityDef {
  return MENTALITIES.find((m) => m.id === id) ?? MENTALITIES[1];
}
