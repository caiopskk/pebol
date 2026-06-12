import type {
  Player,
  Position,
  SquadPick,
  Mentality,
  TeamStrength,
  MatchEvent,
  ShootoutKick,
  MatchResult,
  PlayerPublic,
} from "./types.js";
import { groupOf, getFormation } from "./formations.js";
import { getMentality } from "./mentalities.js";

/**
 * Rating penalty when a player is fielded out of position.
 * - exact position: 0
 * - same group (e.g. CB in an LB slot): -3
 * - adjacent groups (DEF<->MID, MID<->ATT): -10
 * - distant groups (DEF<->ATT) or involving GK: -22
 */
export function positionPenalty(playerPos: Position, slotPos: Position): number {
  if (playerPos === slotPos) return 0;

  const pg = groupOf(playerPos);
  const sg = groupOf(slotPos);

  if (pg === sg) return 3;

  // a goalkeeper anywhere but in goal is a disaster
  if (pg === "GK" || sg === "GK") return 22;

  const order: Record<string, number> = { DEF: 0, MID: 1, ATT: 2 };
  const dist = Math.abs(order[pg] - order[sg]);
  return dist === 1 ? 10 : 22;
}

export function effectiveRating(player: Player, slotPos: Position): number {
  const r = player.rating - positionPenalty(player.pos, slotPos);
  return Math.max(40, Math.round(r));
}

/** Compute team strength per line from the assigned picks. */
export function computeStrength(picks: SquadPick[], formationId: string): TeamStrength {
  const formation = getFormation(formationId);
  const lines: Record<"DEF" | "MID" | "ATT", number[]> = { DEF: [], MID: [], ATT: [] };
  let gk = 0;

  for (const pick of picks) {
    const slot = formation?.slots.find((s) => s.id === pick.slotId);
    const slotPos = slot?.pos ?? pick.player.pos;
    const g = groupOf(slotPos);
    if (g === "GK") {
      gk = pick.effectiveRating;
    } else {
      lines[g].push(pick.effectiveRating);
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 60;

  // the goalkeeper weighs into the defense line
  const defense = picks.length ? (avg(lines.DEF) * 3 + gk * 2) / 5 : 60;
  const midfield = avg(lines.MID);
  const attack = avg(lines.ATT);
  const allRatings = picks.map((p) => p.effectiveRating);
  const overall = allRatings.length
    ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
    : 60;

  return {
    attack: round1(attack),
    midfield: round1(midfield),
    defense: round1(defense),
    overall: round1(overall),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function applyMentality(s: TeamStrength, mentality: Mentality): TeamStrength {
  const m = getMentality(mentality);
  return {
    ...s,
    attack: s.attack * m.attackMod,
    defense: s.defense * m.defenseMod,
  };
}

// ---- Simulation ----

interface SimSide {
  id: string;
  name: string;
  strength: TeamStrength; // mentality already applied
  picks: SquadPick[];
}

type Side = "home" | "away";

/** Attacking weight of a player (chance to score). */
function scoreWeight(pick: SquadPick): number {
  const base: Record<string, number> = { ATT: 7, MID: 3, DEF: 0.7, GK: 0.02 };
  const g = groupOf(pick.player.pos);
  return base[g] * (pick.effectiveRating / 80);
}

/** Pick a random player from the team, weighted by position group. */
function weightedPlayer(side: SimSide, rng: () => number, w: Partial<Record<string, number>>): string {
  const pool = side.picks.map((p) => ({ name: p.player.name, w: (w[groupOf(p.player.pos)] ?? 0) + 0.01 }));
  const total = pool.reduce((a, b) => a + b.w, 0) || 1;
  let r = rng() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.name;
  }
  return pool[0]?.name ?? "o time";
}

const W_ATTACK = { ATT: 7, MID: 3, DEF: 0.7, GK: 0.02 }; // goal scorers
const W_PLAYMAKER = { ATT: 3, MID: 6, DEF: 1.5, GK: 0.02 }; // assist providers
const W_DEFENSE = { ATT: 0.4, MID: 2, DEF: 5, GK: 0.2 }; // fouls / cards
const W_FIELD = { ATT: 1, MID: 1, DEF: 1, GK: 0 };

function pickScorer(side: SimSide, rng: () => number) {
  return weightedPlayer(side, rng, W_ATTACK);
}
function gkName(side: SimSide): string {
  const gk = side.picks.find((p) => groupOf(p.player.pos) === "GK");
  return gk?.player.name ?? "o goleiro";
}
function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const TXT = {
  chance: [
    "Boa chegada do {team}, mas a finalização sai à direita do gol.",
    "{p} arrisca de longe pelo {team} e a bola passa raspando a trave!",
    "Quase! {p} cabeceia para o {team} e a bola explode no travessão!",
    "Contra-ataque rápido do {team}, mas a defesa volta a tempo.",
    "{team} trabalha bem a jogada, {p} chuta e o goleiro fica com a bola.",
  ],
  save: [
    "Que defesa de {gk}! Salvou o {team} de um gol certo.",
    "{gk} espalma firme e mantém o placar para o {team}.",
    "Defesaça de {gk}! Voou no ângulo.",
  ],
  corner: [
    "Escanteio para o {team}.",
    "{team} cobra escanteio e a zaga adversária afasta de cabeça.",
    "Na cobrança de escanteio do {team}, {p} quase marca!",
  ],
  offside: [
    "Impedimento marcado contra o {team}.",
    "{p} estava adiantado: impedimento do {team}.",
    "Bandeira levantada, posição irregular de {p} ({team}).",
  ],
  foul: [
    "Falta dura de {p} no meio de campo.",
    "{p} ({team}) chega atrasado e o árbitro marca falta.",
    "Falta tática de {p} para travar o contra-ataque.",
  ],
  yellow: [
    "Cartão amarelo para {p} ({team}) após a entrada.",
    "Amarelo: {p} ({team}) reclama demais e é advertido.",
    "{p} ({team}) leva amarelo por falta tática.",
  ],
  red: [
    "Cartão vermelho! {p} ({team}) está expulso!",
    "Expulso! {p} ({team}) recebe o segundo amarelo e deixa o {team} com um a menos.",
    "Vermelho direto para {p} ({team}) após entrada violenta!",
  ],
  sub: [
    "Substituição no {team}: sai {p} para a entrada de sangue novo.",
    "{team} mexe no time, {p} dá lugar a um reserva.",
    "Troca no {team}: {p} deixa o gramado aplaudido.",
  ],
  injury: [
    "{p} ({team}) sente um problema muscular e o jogo é paralisado.",
    "Atendimento médico em campo para {p} ({team}).",
  ],
  var: [
    "O árbitro é chamado ao monitor do VAR para revisar o lance.",
    "VAR em ação, checando uma possível irregularidade...",
  ],
};

function fill(tpl: string, side: SimSide, rng: () => number, w = W_FIELD): string {
  return tpl.replace("{team}", side.name).replace("{gk}", gkName(side)).replace("{p}", weightedPlayer(side, rng, w));
}

function buildMatchTimeline(
  home: SimSide,
  away: SimSide,
  homeGoals: number,
  awayGoals: number,
  rng: () => number
): MatchEvent[] {
  const evs: MatchEvent[] = [];
  const sideOf = (k: Side) => (k === "home" ? home : away);
  const add = (minute: number, type: MatchEvent["type"], key: Side | null, text: string, extra: Partial<MatchEvent> = {}) =>
    evs.push({ minute, type, side: key, text, ...extra });

  add(0, "kickoff", null, `Bola rolando! ${home.name} x ${away.name}.`);

  // goals
  const addGoals = (side: SimSide, n: number, key: Side) => {
    for (let i = 0; i < n; i++) {
      const minute = 1 + Math.floor(rng() * 92);
      const scorer = pickScorer(side, rng);
      let assist: string | undefined;
      if (rng() < 0.7) {
        for (let t = 0; t < 4; t++) {
          const a = weightedPlayer(side, rng, W_PLAYMAKER);
          if (a !== scorer) { assist = a; break; }
        }
      }
      const varTag = rng() < 0.18 ? " (confirmado pelo VAR)" : "";
      const assistTxt = assist ? ` Assistência de ${assist}.` : "";
      add(minute, "goal", key, `GOL do ${side.name}! ${scorer} balança a rede!${varTag}${assistTxt}`, {
        player: scorer,
        assist,
      });
    }
  };
  addGoals(home, homeGoals, "home");
  addGoals(away, awayGoals, "away");

  // assorted incidents
  const sprinkle = (n: number, type: MatchEvent["type"], bank: string[], w = W_FIELD, extra?: (s: SimSide) => Partial<MatchEvent>) => {
    for (let i = 0; i < n; i++) {
      const minute = 1 + Math.floor(rng() * 90);
      const key: Side = rng() > 0.5 ? "home" : "away";
      const side = sideOf(key);
      add(minute, type, key, fill(pick(bank, rng), side, rng, w), extra ? extra(side) : {});
    }
  };

  sprinkle(2 + Math.floor(rng() * 3), "chance", TXT.chance, W_ATTACK);
  sprinkle(2 + Math.floor(rng() * 2), "save", TXT.save);
  sprinkle(2 + Math.floor(rng() * 3), "corner", TXT.corner, W_ATTACK);
  sprinkle(1 + Math.floor(rng() * 2), "offside", TXT.offside, W_ATTACK);
  sprinkle(3 + Math.floor(rng() * 3), "foul", TXT.foul, W_DEFENSE);

  // yellow cards
  const nY = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < nY; i++) {
    const minute = 10 + Math.floor(rng() * 80);
    const key: Side = rng() > 0.5 ? "home" : "away";
    const side = sideOf(key);
    const player = weightedPlayer(side, rng, W_DEFENSE);
    add(minute, "card", key, pick(TXT.yellow, rng).replace("{team}", side.name).replace("{p}", player), {
      player,
      card: "yellow",
    });
  }
  // red card (rare)
  if (rng() < 0.16) {
    const key: Side = rng() > 0.5 ? "home" : "away";
    const side = sideOf(key);
    const player = weightedPlayer(side, rng, W_DEFENSE);
    add(40 + Math.floor(rng() * 50), "card", key, pick(TXT.red, rng).replace(/\{team\}/g, side.name).replace("{p}", player), {
      player,
      card: "red",
    });
  }

  // injury (occasional)
  if (rng() < 0.3) sprinkle(1, "injury", TXT.injury);

  // substitutions (second half)
  for (const key of ["home", "away"] as Side[]) {
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const minute = 58 + Math.floor(rng() * 32);
      const side = sideOf(key);
      add(minute, "sub", key, fill(pick(TXT.sub, rng), side, rng, W_FIELD));
    }
  }

  add(45, "halftime", null, "Fim do primeiro tempo.");
  add(90, "fulltime", null, "Fim do segundo tempo. Acabou o jogo!");

  // sort by minute; within a minute: goal first, structural markers last
  const rank = (e: MatchEvent) =>
    e.type === "kickoff" ? -1 : e.type === "goal" ? 0 : e.type === "halftime" || e.type === "fulltime" ? 9 : 1;
  evs.sort((a, b) => a.minute - b.minute || rank(a) - rank(b));
  return evs;
}

/** Simple Poisson draw for goal count from an expectation (xG). */
function poisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function expectedGoals(attacker: SimSide, defender: SimSide): number {
  // midfield drives possession / chance volume
  const midEdge = (attacker.strength.midfield - defender.strength.midfield) / 40;
  const base = (attacker.strength.attack - defender.strength.defense) / 12;
  const xg = 1.25 + base + midEdge;
  return Math.max(0.15, xg);
}

function makeRng(seed: number): () => number {
  // mulberry32
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimInput {
  id: string;
  name: string;
  picks: SquadPick[];
  formationId: string;
  mentality: Mentality;
}

/** Penalty taker order: best finishers first. */
function takerOrder(side: SimSide): string[] {
  return [...side.picks]
    .filter((p) => groupOf(p.player.pos) !== "GK")
    .sort((a, b) => scoreWeight(b) - scoreWeight(a))
    .map((p) => p.player.name);
}

function runShootout(home: SimSide, away: SimSide, rng: () => number) {
  const kicks: ShootoutKick[] = [];
  const tH = takerOrder(home);
  const tA = takerOrder(away);
  let h = 0,
    a = 0,
    ih = 0,
    ia = 0;
  const kick = (side: Side, takers: string[], idx: number): boolean => {
    const taker = takers[idx % takers.length] ?? "o cobrador";
    const scored = rng() > 0.26;
    kicks.push({ side, scored, taker });
    return scored;
  };
  for (let r = 0; r < 5; r++) {
    if (kick("home", tH, ih++)) h++;
    if (kick("away", tA, ia++)) a++;
  }
  let guard = 0;
  while (h === a && guard++ < 12) {
    if (kick("home", tH, ih++)) h++;
    if (kick("away", tA, ia++)) a++;
  }
  if (h === a) h++; // guarantee a winner
  return { kicks, h, a };
}

/**
 * Simulate a single match (first/second half, 90 min) between the two players.
 * A regular-time tie is decided on penalties.
 */
export function simulateMatch(p1: SimInput, p2: SimInput): MatchResult {
  const s1raw = computeStrength(p1.picks, p1.formationId);
  const s2raw = computeStrength(p2.picks, p2.formationId);

  const side1: SimSide = { id: p1.id, name: p1.name, strength: applyMentality(s1raw, p1.mentality), picks: p1.picks };
  const side2: SimSide = { id: p2.id, name: p2.name, strength: applyMentality(s2raw, p2.mentality), picks: p2.picks };

  const seed = Math.floor(Math.random() * 2 ** 31);
  const rng = makeRng(seed);

  const g1 = poisson(expectedGoals(side1, side2), rng);
  const g2 = poisson(expectedGoals(side2, side1), rng);

  const timeline = buildMatchTimeline(side1, side2, g1, g2, rng);
  const goals: Record<string, number> = { [p1.id]: g1, [p2.id]: g2 };

  let winnerId: string;
  let summary: string;
  let shootout: ShootoutKick[] | null = null;
  let penaltyScore: Record<string, number> | null = null;

  if (g1 > g2) {
    winnerId = p1.id;
    summary = `${p1.name} venceu por ${g1} a ${g2}.`;
  } else if (g2 > g1) {
    winnerId = p2.id;
    summary = `${p2.name} venceu por ${g2} a ${g1}.`;
  } else {
    const so = runShootout(side1, side2, rng);
    shootout = so.kicks;
    penaltyScore = { [p1.id]: so.h, [p2.id]: so.a };
    winnerId = so.h > so.a ? p1.id : p2.id;
    const wName = winnerId === p1.id ? p1.name : p2.name;
    summary = `Empate em ${g1} a ${g2}. Nos pênaltis (${so.h} x ${so.a}), ${wName} levou a melhor!`;
  }

  return {
    homeId: p1.id,
    awayId: p2.id,
    timeline,
    goals,
    shootout,
    penaltyScore,
    strengths: { [p1.id]: s1raw, [p2.id]: s2raw },
    winnerId,
    summary,
  };
}

// ---- Draft utilities ----

/** Slots the player has not filled yet. */
export function openSlots(player: PlayerPublic): string[] {
  const formation = player.formationId ? getFormation(player.formationId) : undefined;
  if (!formation) return [];
  const filled = new Set(player.picks.map((p) => p.slotId));
  return formation.slots.filter((s) => !filled.has(s.id)).map((s) => s.id);
}
