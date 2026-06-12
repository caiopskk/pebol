import type { Formation, Position, PosGroup } from "./types.js";

/** Map a specific position to its group. */
export function groupOf(pos: Position): PosGroup {
  switch (pos) {
    case "GK":
      return "GK";
    case "RB":
    case "LB":
    case "CB":
    case "RWB":
    case "LWB":
      return "DEF";
    case "CDM":
    case "CM":
    case "CAM":
    case "RM":
    case "LM":
      return "MID";
    case "RW":
    case "LW":
    case "CF":
    case "ST":
      return "ATT";
  }
}

// Coordinates: y=0 is the team's own goal line, y=100 is the attack.
// x=0 esquerda, x=100 direita.
export const FORMATIONS: Formation[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 16, y: 26 },
      { id: "CB1", pos: "CB", x: 38, y: 20 },
      { id: "CB2", pos: "CB", x: 62, y: 20 },
      { id: "RB", pos: "RB", x: 84, y: 26 },
      { id: "CM1", pos: "CM", x: 30, y: 50 },
      { id: "CM2", pos: "CDM", x: 50, y: 44 },
      { id: "CM3", pos: "CAM", x: 70, y: 50 },
      { id: "LW", pos: "LW", x: 18, y: 78 },
      { id: "ST", pos: "ST", x: 50, y: 84 },
      { id: "RW", pos: "RW", x: 82, y: 78 },
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 16, y: 26 },
      { id: "CB1", pos: "CB", x: 38, y: 20 },
      { id: "CB2", pos: "CB", x: 62, y: 20 },
      { id: "RB", pos: "RB", x: 84, y: 26 },
      { id: "LM", pos: "LM", x: 18, y: 52 },
      { id: "CM1", pos: "CM", x: 40, y: 48 },
      { id: "CM2", pos: "CM", x: 60, y: 48 },
      { id: "RM", pos: "RM", x: 82, y: 52 },
      { id: "ST1", pos: "ST", x: 38, y: 82 },
      { id: "ST2", pos: "ST", x: 62, y: 82 },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "CB1", pos: "CB", x: 30, y: 20 },
      { id: "CB2", pos: "CB", x: 50, y: 18 },
      { id: "CB3", pos: "CB", x: 70, y: 20 },
      { id: "LWB", pos: "LWB", x: 12, y: 48 },
      { id: "CM1", pos: "CM", x: 36, y: 46 },
      { id: "CDM", pos: "CDM", x: 50, y: 40 },
      { id: "CM2", pos: "CAM", x: 64, y: 52 },
      { id: "RWB", pos: "RWB", x: 88, y: 48 },
      { id: "ST1", pos: "ST", x: 38, y: 82 },
      { id: "ST2", pos: "ST", x: 62, y: 82 },
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 16, y: 26 },
      { id: "CB1", pos: "CB", x: 38, y: 20 },
      { id: "CB2", pos: "CB", x: 62, y: 20 },
      { id: "RB", pos: "RB", x: 84, y: 26 },
      { id: "DM1", pos: "CDM", x: 38, y: 42 },
      { id: "DM2", pos: "CDM", x: 62, y: 42 },
      { id: "LAM", pos: "LM", x: 20, y: 64 },
      { id: "CAM", pos: "CAM", x: 50, y: 66 },
      { id: "RAM", pos: "RM", x: 80, y: 64 },
      { id: "ST", pos: "ST", x: 50, y: 86 },
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "CB1", pos: "CB", x: 30, y: 20 },
      { id: "CB2", pos: "CB", x: 50, y: 18 },
      { id: "CB3", pos: "CB", x: 70, y: 20 },
      { id: "LM", pos: "LM", x: 14, y: 50 },
      { id: "CM1", pos: "CM", x: 40, y: 46 },
      { id: "CM2", pos: "CM", x: 60, y: 46 },
      { id: "RM", pos: "RM", x: 86, y: 50 },
      { id: "LW", pos: "LW", x: 22, y: 80 },
      { id: "ST", pos: "ST", x: 50, y: 84 },
      { id: "RW", pos: "RW", x: 78, y: 80 },
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LWB", pos: "LWB", x: 10, y: 32 },
      { id: "CB1", pos: "CB", x: 32, y: 20 },
      { id: "CB2", pos: "CB", x: 50, y: 18 },
      { id: "CB3", pos: "CB", x: 68, y: 20 },
      { id: "RWB", pos: "RWB", x: 90, y: 32 },
      { id: "CM1", pos: "CM", x: 32, y: 52 },
      { id: "CDM", pos: "CDM", x: 50, y: 48 },
      { id: "CM2", pos: "CAM", x: 68, y: 54 },
      { id: "ST1", pos: "ST", x: 38, y: 82 },
      { id: "ST2", pos: "ST", x: 62, y: 82 },
    ],
  },
  {
    id: "4-2-4",
    name: "4-2-4",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 14, y: 26 },
      { id: "CB1", pos: "CB", x: 37, y: 20 },
      { id: "CB2", pos: "CB", x: 63, y: 20 },
      { id: "RB", pos: "RB", x: 86, y: 26 },
      { id: "CM1", pos: "CM", x: 38, y: 46 },
      { id: "CM2", pos: "CM", x: 62, y: 46 },
      { id: "LW", pos: "LW", x: 16, y: 76 },
      { id: "ST1", pos: "ST", x: 40, y: 82 },
      { id: "ST2", pos: "ST", x: 60, y: 82 },
      { id: "RW", pos: "RW", x: 84, y: 76 },
    ],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "CB1", pos: "CB", x: 30, y: 20 },
      { id: "CB2", pos: "CB", x: 50, y: 18 },
      { id: "CB3", pos: "CB", x: 70, y: 20 },
      { id: "LM", pos: "LM", x: 12, y: 48 },
      { id: "CM1", pos: "CM", x: 40, y: 44 },
      { id: "CM2", pos: "CM", x: 60, y: 44 },
      { id: "RM", pos: "RM", x: 88, y: 48 },
      { id: "CAM1", pos: "CAM", x: 38, y: 68 },
      { id: "CAM2", pos: "CAM", x: 62, y: 68 },
      { id: "ST", pos: "ST", x: 50, y: 86 },
    ],
  },
  {
    id: "4-1-3-2",
    name: "4-1-3-2",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 16, y: 26 },
      { id: "CB1", pos: "CB", x: 38, y: 20 },
      { id: "CB2", pos: "CB", x: 62, y: 20 },
      { id: "RB", pos: "RB", x: 84, y: 26 },
      { id: "CDM", pos: "CDM", x: 50, y: 40 },
      { id: "LM", pos: "LM", x: 22, y: 58 },
      { id: "CM", pos: "CM", x: 50, y: 60 },
      { id: "RM", pos: "RM", x: 78, y: 58 },
      { id: "ST1", pos: "ST", x: 40, y: 84 },
      { id: "ST2", pos: "ST", x: 60, y: 84 },
    ],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    slots: [
      { id: "GK", pos: "GK", x: 50, y: 6 },
      { id: "LB", pos: "LB", x: 16, y: 26 },
      { id: "CB1", pos: "CB", x: 38, y: 20 },
      { id: "CB2", pos: "CB", x: 62, y: 20 },
      { id: "RB", pos: "RB", x: 84, y: 26 },
      { id: "CDM", pos: "CDM", x: 50, y: 40 },
      { id: "LM", pos: "LM", x: 16, y: 60 },
      { id: "CM1", pos: "CM", x: 40, y: 58 },
      { id: "CM2", pos: "CM", x: 60, y: 58 },
      { id: "RM", pos: "RM", x: 84, y: 60 },
      { id: "ST", pos: "ST", x: 50, y: 86 },
    ],
  },
];

export function getFormation(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

// Portuguese position abbreviations (EA FC PT-BR style).
const POS_LABEL: Record<Position, string> = {
  GK: "GOL",
  RB: "LD",
  LB: "LE",
  CB: "ZAG",
  RWB: "ALD",
  LWB: "ALE",
  CDM: "VOL",
  CM: "MC",
  CAM: "MEI",
  RM: "MD",
  LM: "ME",
  RW: "PD",
  LW: "PE",
  CF: "SA",
  ST: "CA",
};

const POS_NAME: Record<Position, string> = {
  GK: "Goleiro",
  RB: "Lateral-direito",
  LB: "Lateral-esquerdo",
  CB: "Zagueiro",
  RWB: "Ala-direito",
  LWB: "Ala-esquerdo",
  CDM: "Volante",
  CM: "Meio-campista",
  CAM: "Meia-atacante",
  RM: "Meia-direita",
  LM: "Meia-esquerda",
  RW: "Ponta-direita",
  LW: "Ponta-esquerda",
  CF: "Segundo-atacante",
  ST: "Centroavante",
};

/** Portuguese position abbreviation (e.g. ST -> CA). */
export function posLabel(pos: Position): string {
  return POS_LABEL[pos] ?? pos;
}

/** Full Portuguese position name (e.g. ST -> Centroavante). */
export function posName(pos: Position): string {
  return POS_NAME[pos] ?? pos;
}
