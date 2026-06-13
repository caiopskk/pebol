import type { Mentality } from "./types.js";

export interface MentalityDef {
  id: Mentality;
  name: string;
  desc: string;
  attackMod: number; // multiplier applied to attack strength
  defenseMod: number; // multiplier applied to defense strength
  counters: Mentality | null; // style this one tactically disrupts (rock-paper-scissors)
}

// Two groups of styles:
//  - Axis trio (aura / equilibrada / retranca): pure attack<->defense tradeoffs,
//    outside the counter triangle. Equilibrada is the only counter-immune style.
//  - Counter triangle (pressao -> posse -> contra_ataque -> pressao): balanced
//    base stats, but each hard-counters one other style. Reading the opponent
//    and picking the right counter is worth roughly a goal (see applyCounter).
export const MENTALITIES: MentalityDef[] = [
  {
    id: "aura",
    name: "Agressivo",
    desc: "Tudo pra frente: +12% ataque, -12% defesa. Aposta alta, sem rede.",
    attackMod: 1.12,
    defenseMod: 0.88,
    counters: null,
  },
  {
    id: "equilibrada",
    name: "Equilibrada",
    desc: "Sem bônus, mas imune a leituras: nenhum estilo te neutraliza.",
    attackMod: 1.0,
    defenseMod: 1.0,
    counters: null,
  },
  {
    id: "retranca",
    name: "Retranca",
    desc: "Ferrolho: +12% defesa, -12% ataque.",
    attackMod: 0.88,
    defenseMod: 1.12,
    counters: null,
  },
  {
    id: "pressao",
    name: "Marcação pressão",
    desc: "Sufoca a saída de bola: +6% ataque, -6% defesa. Neutraliza a Posse de Bola.",
    attackMod: 1.06,
    defenseMod: 0.94,
    counters: "posse",
  },
  {
    id: "posse",
    name: "Posse de Bola",
    desc: "Controla o ritmo: +3% ataque, -3% defesa. Neutraliza o Contra-ataque.",
    attackMod: 1.03,
    defenseMod: 0.97,
    counters: "contra_ataque",
  },
  {
    id: "contra_ataque",
    name: "Contra-ataque",
    desc: "Bloco baixo, saída rápida: -4% ataque, +4% defesa. Neutraliza a Marcação pressão.",
    attackMod: 0.96,
    defenseMod: 1.04,
    counters: "pressao",
  },
];

export function getMentality(id: Mentality): MentalityDef {
  return MENTALITIES.find((m) => m.id === id) ?? MENTALITIES[1];
}

/**
 * Counter triangle resolution: returns which side gets the tactical edge when
 * `a` and `b` face each other, or null if neither counters the other.
 */
export function mentalityEdge(a: Mentality, b: Mentality): "a" | "b" | null {
  if (getMentality(a).counters === b) return "a";
  if (getMentality(b).counters === a) return "b";
  return null;
}
