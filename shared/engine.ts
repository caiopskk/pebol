import type {
  Player,
  Position,
  SquadPick,
  Mentality,
  AttackFocus,
  TeamStrength,
  MatchEvent,
  ShootoutKick,
  MatchResult,
  GauntletResult,
  Team,
  PlayerPublic,
} from "./types.js";
import { groupOf, getFormation } from "./formations.js";
import { getMentality, mentalityEdge } from "./mentalities.js";

/**
 * Rating penalty when a player is fielded out of position.
 * - exact position: 0
 * - same group (e.g. CB in an LB slot): -3
 * - adjacent groups (DEF<->MID, MID<->ATT): -10
 * - distant groups (DEF<->ATT) or involving GK: -22
 */
export function positionPenalty(
  playerPos: Position,
  slotPos: Position,
): number {
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

function defaultAltPositions(pos: Position): Position[] {
  const map: Partial<Record<Position, Position[]>> = {
    RB: ["RWB"],
    RWB: ["RB", "RM"],
    LB: ["LWB"],
    LWB: ["LB", "LM"],
    CDM: ["CM"],
    CM: ["CDM", "CAM"],
    CAM: ["CM", "CF"],
    RM: ["RW", "RWB"],
    LM: ["LW", "LWB"],
    RW: ["RM", "LW"],
    LW: ["LM", "RW"],
    CF: ["ST", "CAM"],
    ST: ["CF"],
  };
  return map[pos] ?? [];
}

export function playerPositions(player: Player): Position[] {
  return [player.pos, ...defaultAltPositions(player.pos), ...(player.altPositions ?? [])].filter(
    (pos, idx, arr) => arr.indexOf(pos) === idx,
  );
}

export function playerPositionPenalty(player: Player, slotPos: Position): number {
  return Math.min(...playerPositions(player).map((pos) => positionPenalty(pos, slotPos)));
}

export function effectiveRating(player: Player, slotPos: Position): number {
  const r = player.rating - playerPositionPenalty(player, slotPos);
  return Math.max(40, Math.round(r));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

type PlayerAttr = "pac" | "sho" | "pas" | "dri" | "def" | "phy";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clampRating(n: number): number {
  return clamp(n, 40, 99);
}

function playerAttr(player: Player, attr: PlayerAttr): number {
  return player[attr] ?? player.rating;
}

function positionFit(pick: SquadPick): number {
  return clamp(pick.effectiveRating / Math.max(1, pick.player.rating), 0.55, 1);
}

function adjustedAttr(pick: SquadPick, attr: PlayerAttr): number {
  return clampRating(playerAttr(pick.player, attr) * positionFit(pick));
}

function attrScore(
  pick: SquadPick,
  weights: Partial<Record<PlayerAttr, number>>,
): number {
  let sum = 0;
  let total = 0;
  for (const [attr, weight] of Object.entries(weights) as [PlayerAttr, number][]) {
    sum += adjustedAttr(pick, attr) * weight;
    total += weight;
  }
  return total ? clampRating(sum / total) : pick.effectiveRating;
}

function attackingSkill(pick: SquadPick): number {
  return attrScore(pick, { sho: 0.36, dri: 0.24, pac: 0.18, pas: 0.12, phy: 0.1 });
}

function playmakingSkill(pick: SquadPick): number {
  return attrScore(pick, { pas: 0.42, dri: 0.26, sho: 0.1, pac: 0.1, def: 0.07, phy: 0.05 });
}

function defendingSkill(pick: SquadPick): number {
  return attrScore(pick, { def: 0.48, phy: 0.22, pac: 0.12, pas: 0.08, dri: 0.06, sho: 0.04 });
}

function keeperSkill(pick: SquadPick): number {
  return attrScore(pick, { def: 0.46, phy: 0.22, pac: 0.1, dri: 0.08, pas: 0.08, sho: 0.06 });
}

function midfieldSkill(pick: SquadPick): number {
  return attrScore(pick, { pas: 0.34, dri: 0.24, def: 0.16, phy: 0.1, pac: 0.1, sho: 0.06 });
}

function roleScore(pick: SquadPick, slotPos: Position): number {
  const group = groupOf(slotPos);
  if (group === "GK") return keeperSkill(pick);
  if (group === "DEF") return defendingSkill(pick);
  if (group === "MID") return midfieldSkill(pick);
  return attackingSkill(pick);
}

/** Compute team strength per line from the assigned picks and player attributes. */
export function computeStrength(
  picks: SquadPick[],
  formationId: string,
): TeamStrength {
  const formation = getFormation(formationId);
  const lines: Record<"DEF" | "MID" | "ATT", number[]> = {
    DEF: [],
    MID: [],
    ATT: [],
  };
  const allScores: number[] = [];
  let gk = 0;

  for (const pick of picks) {
    const slot = formation?.slots.find((s) => s.id === pick.slotId);
    const slotPos = slot?.pos ?? pick.player.pos;
    const score = roleScore(pick, slotPos);
    allScores.push(score);
    const group = groupOf(slotPos);
    if (group === "GK") {
      gk = score;
    } else {
      lines[group].push(score);
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 60;

  const defense = picks.length ? (avg(lines.DEF) * 3 + gk * 2) / 5 : 60;
  const midfield = avg(lines.MID);
  const attack = avg(lines.ATT);
  const overall = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : 60;

  return {
    attack: round1(attack),
    midfield: round1(midfield),
    defense: round1(defense),
    overall: round1(overall),
  };
}

function applyMentality(
  s: TeamStrength,
  mentality: Mentality,
  weight = 1,
): TeamStrength {
  const m = getMentality(mentality);
  // weight > 1 amplifies the deviation from neutral (1.0). Used in World Cup mode.
  const atk = 1 + (m.attackMod - 1) * weight;
  const def = 1 + (m.defenseMod - 1) * weight;
  return { ...s, attack: s.attack * atk, defense: s.defense * def };
}

// ---- Simulation ----

interface SimSide {
  id: string;
  name: string;
  strength: TeamStrength; // mentality already applied
  picks: SquadPick[];
  midCount: number; // number of midfield slots in the formation (numerical superiority)
}

/** Count formation slots in a given position group. */
function lineCount(formationId: string, group: "DEF" | "MID" | "ATT"): number {
  const f = getFormation(formationId);
  return f ? f.slots.filter((s) => groupOf(s.pos) === group).length : 0;
}

// Wide vs central positions, for the attacking-focus tactic.
const WIDE_POS = new Set<Position>(["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"]);
const CENTRAL_POS = new Set<Position>(["CDM", "CM", "CAM", "CF", "ST"]);

function zoneAvg(picks: SquadPick[], set: Set<Position>): number | null {
  const r = picks
    .filter((p) => set.has(p.player.pos))
    .map((p) => attackingSkill(p));
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
}

/**
 * Attacking-focus multiplier applied to a side's attack. Channelling the attack
 * down a zone (wings/center) rewards squads strong there and punishes forcing it
 * through a weak zone — so it's a real read on your own draft. Capped at ±~11%.
 */
function attackFocusMod(
  picks: SquadPick[],
  focus: AttackFocus | undefined,
  overall: number,
): number {
  if (!focus || focus === "equilibrado") return 1;
  const zone = focus === "lados" ? WIDE_POS : CENTRAL_POS;
  const avg = zoneAvg(picks, zone);
  if (avg == null) return 1;
  return Math.max(0.9, Math.min(1.11, 1 + (avg - overall) / 120));
}

/**
 * How well each attacking focus fits a squad: per-zone average vs the team's
 * overall, and the focus the squad is best suited to (or "equilibrado" if no
 * zone clearly stands out). Used by the UI to advise the player.
 */
export function attackFocusReport(picks: SquadPick[]): {
  wide: number | null;
  central: number | null;
  overall: number;
  best: AttackFocus;
} {
  const overall = picks.length
    ? picks.reduce((a, p) => a + attackingSkill(p), 0) / picks.length
    : 0;
  const wide = zoneAvg(picks, WIDE_POS);
  const central = zoneAvg(picks, CENTRAL_POS);
  const wideDelta = wide == null ? -Infinity : wide - overall;
  const centralDelta = central == null ? -Infinity : central - overall;
  let best: AttackFocus = "equilibrado";
  if (Math.max(wideDelta, centralDelta) > 1.5)
    best = wideDelta >= centralDelta ? "lados" : "meio";
  return { wide, central, overall, best };
}

type Side = "home" | "away";

/** Attacking weight of a player (chance to score). */
function scoreWeight(pick: SquadPick): number {
  const base: Record<string, number> = { ATT: 7, MID: 3, DEF: 0.7, GK: 0.02 };
  const g = groupOf(pick.player.pos);
  return base[g] * (attackingSkill(pick) / 80);
}

function eventSkill(
  pick: SquadPick,
  weights: Partial<Record<string, number>>,
): number {
  if (weights === W_ATTACK || weights === W_CHANCE) return attackingSkill(pick);
  if (weights === W_PLAYMAKER) return playmakingSkill(pick);
  if (weights === W_DEFENSE) return defendingSkill(pick);
  return pick.effectiveRating;
}

/** Pick a random player from the team, weighted by position group. */
function weightedPlayer(
  side: SimSide,
  rng: () => number,
  w: Partial<Record<string, number>>,
): string {
  const pool = side.picks.map((p) => ({
    name: p.player.name,
    w: ((w[groupOf(p.player.pos)] ?? 0) * eventSkill(p, w)) / 80 + 0.01,
  }));
  const total = pool.reduce((a, b) => a + b.w, 0) || 1;
  let r = rng() * total;
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.name;
  }
  return pool[0]?.name ?? "o time";
}

const W_ATTACK = { ATT: 7, MID: 3, DEF: 0.7, GK: 0.02 }; // goal scorers
const W_CHANCE = { ATT: 8, MID: 3, DEF: 0.08, GK: 0.01 }; // open-play chances
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
function teamLabel(side: SimSide): string {
  return `${side.name}`;
}

const TXT = {
  buildup: [
    "{team} recupera a bola no meio e acelera com {p}.",
    "{p} acha espaço entre as linhas e chama a jogada para o {team}.",
    "{team} troca passes com calma até encontrar o corredor livre.",
    "Virada rápida do {team}; {p} recebe com campo para atacar.",
    "{p} puxa contra-ataque e deixa a defesa adversária desarrumada.",
  ],
  assistMove: [
    "{p} cruza na medida para a área.",
    "{p} enfia um passe limpo nas costas da defesa.",
    "{p} tabela curto e devolve em ótima condição.",
    "{p} ganha no corpo e rola para a finalização.",
  ],
  chance: [
    "Boa chegada do {team}, mas a finalização sai à direita do gol.",
    "{p} arrisca pelo {team} e a bola passa raspando a trave!",
    "Quase! {p} aparece na área pelo {team} e acerta o travessão!",
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
  possession: [
    "{team} fica com a posse e troca passes no meio.",
    "Posse de bola do {team}, sem pressa para construir.",
    "{team} roda a bola tentando abrir espaço.",
    "{p} comanda a saída de bola do {team}.",
    "{team} mantém a posse no campo de defesa.",
    "{team} pressiona a saída do adversário.",
    "{p} tenta acionar o ataque do {team}.",
    "Jogo equilibrado no meio-campo, {team} com a bola.",
  ],
  injury: [
    "{p} ({team}) sente um problema muscular e o jogo é paralisado.",
    "Atendimento médico em campo para {p} ({team}).",
  ],
  var: [
    "O árbitro é chamado ao monitor do VAR para revisar o lance.",
    "VAR em ação, checando uma possível irregularidade...",
  ],
  pressure: [
    "{team} aperta a saída e força um chutão da defesa.",
    "{p} antecipa bem pelo {team} e mata uma jogada perigosa.",
    "{team} fica com a bola por um longo período, procurando espaço.",
    "A torcida sente o momento: o {team} empurra o adversário para trás.",
  ],
};

function fill(
  tpl: string,
  side: SimSide,
  rng: () => number,
  w = W_FIELD,
): string {
  return tpl
    .replace(/\{team\}/g, teamLabel(side))
    .replace(/\{gk\}/g, gkName(side))
    .replace(/\{p\}/g, weightedPlayer(side, rng, w));
}

// Field coordinates on a 105x68 grid (1..105 long, 1..68 wide).
// "home" attacks toward x=105, "away" toward x=0; corner 1-1 is a corner flag.
const between = (lo: number, hi: number, rng: () => number) =>
  lo + Math.floor(rng() * (hi - lo + 1));
const clampN = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.round(v)));

function ballSpot(
  type: MatchEvent["type"],
  side: Side | null,
  rng: () => number,
): { bx: number; by: number } {
  // depth = attacking progress toward the opponent goal (0..105)
  const orient = (depth: number, y: number) => ({
    bx: clampN(side === "away" ? 106 - depth : depth, 1, 105),
    by: clampN(y, 1, 68),
  });
  switch (type) {
    case "kickoff":
    case "halftime":
    case "fulltime":
      return { bx: 53, by: 34 };
    case "goal":
      return orient(between(101, 105, rng), between(28, 41, rng));
    case "penalty":
      return orient(94, 34);
    case "chance":
      return orient(between(85, 100, rng), between(22, 46, rng));
    case "corner":
      return orient(
        between(103, 105, rng),
        rng() < 0.5 ? between(1, 3, rng) : between(65, 67, rng),
      );
    case "offside":
      return orient(between(80, 96, rng), between(12, 56, rng));
    case "save": // the saving team is near its OWN goal
      return orient(between(2, 11, rng), between(26, 42, rng));
    case "info": // goal build-up around midfield
      return orient(between(48, 72, rng), between(18, 50, rng));
    case "possession":
      return orient(between(36, 66, rng), between(12, 56, rng));
    case "foul":
    case "card":
    case "injury":
      return orient(between(32, 82, rng), between(8, 60, rng));
    default:
      return orient(between(40, 65, rng), between(20, 48, rng));
  }
}

/**
 * Build one half of the match (minutes within its range, plus the closing marker).
 * Fills every otherwise-empty minute with a possession line for a minute-by-minute feel.
 */
interface HalfExpelled {
  home: string[];
  away: string[];
}

function buildHalfTimeline(
  home: SimSide,
  away: SimSide,
  homeGoals: number,
  awayGoals: number,
  rng: () => number,
  half: 1 | 2,
  preExpelled: HalfExpelled = { home: [], away: [] },
): { events: MatchEvent[]; expelled: HalfExpelled } {
  const evs: MatchEvent[] = [];
  const sideOf = (k: Side) => (k === "home" ? home : away);
  const start = half === 1 ? 1 : 46;
  const end = half === 1 ? 44 : 89;
  const span = end - start + 1;
  const randMin = () => start + Math.floor(rng() * span);

  const add = (
    minute: number,
    type: MatchEvent["type"],
    key: Side | null,
    text: string,
    extra: Partial<MatchEvent> = {},
  ) => {
    const spot = ballSpot(type, key, rng);
    evs.push({
      minute,
      type,
      side: key,
      text,
      bx: spot.bx,
      by: spot.by,
      ...extra,
    });
  };

  // players sent off, with the minute they left (pre-expelled left before this half)
  const gone: { key: Side; name: string; from: number }[] = [
    ...preExpelled.home.map((name) => ({
      key: "home" as Side,
      name,
      from: start - 1,
    })),
    ...preExpelled.away.map((name) => ({
      key: "away" as Side,
      name,
      from: start - 1,
    })),
  ];
  // side with already-expelled players removed for events at the given minute
  const availSide = (key: Side, minute: number): SimSide => {
    const side = sideOf(key);
    const banned = new Set(
      gone.filter((g) => g.key === key && g.from <= minute).map((g) => g.name),
    );
    if (!banned.size) return side;
    const picks = side.picks.filter((p) => !banned.has(p.player.name));
    return picks.length ? { ...side, picks } : side;
  };

  if (half === 1)
    add(
      0,
      "kickoff",
      null,
      `Bola rolando! ${teamLabel(home)} x ${teamLabel(away)}.`,
    );

  // decide the red card first so later events can leave the sent-off player out
  if (rng() < 0.1) {
    const key: Side = rng() > 0.5 ? "home" : "away";
    const minute = randMin();
    const player = weightedPlayer(availSide(key, minute), rng, W_DEFENSE);
    add(
      minute,
      "card",
      key,
      pick(TXT.red, rng)
        .replace(/\{team\}/g, teamLabel(sideOf(key)))
        .replace(/\{p\}/g, player),
      {
        player,
        card: "red",
      },
    );
    gone.push({ key, name: player, from: minute });
  }

  // goals, each preceded by a build-up and a final pass
  const addGoals = (key: Side, n: number) => {
    for (let i = 0; i < n; i++) {
      const minute = Math.min(
        end,
        start + 2 + Math.floor(rng() * Math.max(1, span - 2)),
      );
      const aSide = availSide(key, minute);
      const scorer = pickScorer(aSide, rng);
      let assist: string | undefined;
      if (rng() < 0.7) {
        for (let t = 0; t < 4; t++) {
          const a = weightedPlayer(aSide, rng, W_PLAYMAKER);
          if (a !== scorer) {
            assist = a;
            break;
          }
        }
      }
      const varTag = rng() < 0.18 ? " (confirmado pelo VAR)" : "";
      const assistTxt = assist ? ` Assistência de ${assist}.` : "";
      add(
        Math.max(start, minute - 2),
        "info",
        key,
        fill(
          pick(TXT.buildup, rng),
          availSide(key, minute - 2),
          rng,
          W_PLAYMAKER,
        ),
      );
      add(
        Math.max(start, minute - 1),
        "chance",
        key,
        fill(
          pick(TXT.assistMove, rng),
          availSide(key, minute - 1),
          rng,
          W_PLAYMAKER,
        ),
      );
      add(
        minute,
        "goal",
        key,
        `GOL do ${teamLabel(sideOf(key))}! ${scorer} balança a rede!${varTag}${assistTxt}`,
        {
          player: scorer,
          assist,
        },
      );
    }
  };
  addGoals("home", homeGoals);
  addGoals("away", awayGoals);

  // assorted incidents within this half
  const sprinkle = (
    n: number,
    type: MatchEvent["type"],
    bank: string[],
    w = W_FIELD,
  ) => {
    for (let i = 0; i < n; i++) {
      const key: Side = rng() > 0.5 ? "home" : "away";
      const minute = randMin();
      add(
        minute,
        type,
        key,
        fill(pick(bank, rng), availSide(key, minute), rng, w),
      );
    }
  };

  sprinkle(1 + Math.floor(rng() * 2), "chance", TXT.chance, W_CHANCE);
  sprinkle(1 + Math.floor(rng() * 2), "save", TXT.save, W_FIELD);
  sprinkle(1 + Math.floor(rng() * 2), "corner", TXT.corner, W_ATTACK);
  sprinkle(Math.floor(rng() * 2), "offside", TXT.offside, W_ATTACK);
  sprinkle(2 + Math.floor(rng() * 2), "foul", TXT.foul, W_DEFENSE);

  // yellow cards
  const nY = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < nY; i++) {
    const key: Side = rng() > 0.5 ? "home" : "away";
    const minute = randMin();
    const player = weightedPlayer(availSide(key, minute), rng, W_DEFENSE);
    add(
      minute,
      "card",
      key,
      pick(TXT.yellow, rng)
        .replace(/\{team\}/g, teamLabel(sideOf(key)))
        .replace(/\{p\}/g, player),
      {
        player,
        card: "yellow",
      },
    );
  }

  // injury (occasional)
  if (rng() < 0.2) sprinkle(1, "injury", TXT.injury);

  // fill every still-empty minute with a possession line (minute-by-minute updates)
  const busy = new Set(
    evs
      .filter((e) => e.minute >= start && e.minute <= end)
      .map((e) => e.minute),
  );
  for (let m = start; m <= end; m++) {
    if (busy.has(m)) continue;
    const key: Side = rng() > 0.5 ? "home" : "away";
    add(
      m,
      "possession",
      key,
      fill(pick(TXT.possession, rng), availSide(key, m), rng, W_FIELD),
    );
  }

  if (half === 1) add(45, "halftime", null, "Fim do primeiro tempo.");
  else add(90, "fulltime", null, "Fim do segundo tempo. Acabou o jogo!");

  // sort by minute; within a minute: goal first, possession before structural markers
  const rank = (e: MatchEvent) =>
    e.type === "kickoff"
      ? -1
      : e.type === "goal"
        ? 0
        : e.type === "halftime" || e.type === "fulltime"
          ? 9
          : e.type === "possession"
            ? 3
            : 1;
  evs.sort((a, b) => a.minute - b.minute || rank(a) - rank(b));

  return {
    events: evs,
    expelled: {
      home: gone.filter((g) => g.key === "home").map((g) => g.name),
      away: gone.filter((g) => g.key === "away").map((g) => g.name),
    },
  };
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
  // Rating gaps drive most of the result (steeper than before, so the better
  // squad wins more reliably ~ less luck). The flat base is small so it adds
  // little free noise.
  const base = (attacker.strength.attack - defender.strength.defense) / 15;
  // midfield quality gap...
  const midRating =
    (attacker.strength.midfield - defender.strength.midfield) / 48;
  // ...plus numerical superiority in midfield (formation choice matters)
  const midControl = (attacker.midCount - defender.midCount) * 0.05;
  const xg = 0.78 + base + midRating + midControl;
  return Math.max(0.15, Math.min(2.7, xg));
}

/**
 * Apply the mentality counter triangle to both sides' strengths. The countering
 * side gets an attacking edge; the countered side is disrupted (loses attack and
 * a bit of defense). Worth roughly a goal — this is the main tactical read.
 */
function applyCounter(
  a: SimSide,
  aMent: Mentality,
  b: SimSide,
  bMent: Mentality,
): void {
  const edge = mentalityEdge(aMent, bMent);
  if (!edge) return;
  const winner = edge === "a" ? a : b;
  const loser = edge === "a" ? b : a;
  winner.strength = {
    ...winner.strength,
    attack: winner.strength.attack * 1.06,
    defense: winner.strength.defense * 1.02,
  };
  loser.strength = {
    ...loser.strength,
    attack: loser.strength.attack * 0.92,
    defense: loser.strength.defense * 0.97,
  };
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
  attackFocus?: AttackFocus;
  // Optional global strength multiplier (e.g. Hardcore mode buffs the AI to make
  // it harder, but not impossible, to win). Defaults to 1 (no change).
  strengthScale?: number;
}

function penaltyTakerSkill(pick: SquadPick): number {
  return attrScore(pick, {
    sho: 0.56,
    dri: 0.16,
    phy: 0.12,
    pas: 0.08,
    pac: 0.08,
  });
}

function penaltyKeeperSkill(pick: SquadPick): number {
  return attrScore(pick, {
    def: 0.5,
    phy: 0.2,
    pac: 0.12,
    dri: 0.08,
    pas: 0.06,
    sho: 0.04,
  });
}

function goalkeeperPick(side: SimSide): SquadPick | undefined {
  return (
    side.picks.find((p) => groupOf(p.player.pos) === "GK") ??
    side.picks.find((p) => p.slotId.toLowerCase().includes("gk")) ??
    side.picks[0]
  );
}

function penaltyChance(taker: SquadPick, keeper: SquadPick | undefined): number {
  const kicker = penaltyTakerSkill(taker);
  const gk = keeper ? penaltyKeeperSkill(keeper) : 75;
  return clamp(0.76 + (kicker - gk) / 180, 0.58, 0.92);
}

/** Penalty taker order: best finishers first. */
function takerOrder(side: SimSide): SquadPick[] {
  return [...side.picks]
    .filter((p) => groupOf(p.player.pos) !== "GK")
    .sort((a, b) => penaltyTakerSkill(b) - penaltyTakerSkill(a));
}

function runShootout(home: SimSide, away: SimSide, rng: () => number) {
  const kicks: ShootoutKick[] = [];
  const tH = takerOrder(home);
  const tA = takerOrder(away);
  let h = 0, a = 0; // goals
  let kh = 0, ka = 0; // kicks taken
  const take = (side: Side, takers: SquadPick[], n: number): boolean => {
    const team = side === "home" ? home : away;
    const opponent = side === "home" ? away : home;
    const taker = takers[n % takers.length] ?? team.picks[0];
    const scored = taker
      ? rng() < penaltyChance(taker, goalkeeperPick(opponent))
      : rng() > 0.26;
    kicks.push({ side, scored, taker: taker?.player.name ?? "o cobrador" });
    return scored;
  };
  // a team is already out of the best-of-5 if it can't catch up with its remaining kicks
  const decidedInFive = () =>
    kh <= 5 && ka <= 5 && (h > a + (5 - ka) || a > h + (5 - kh));

  // best of 5, alternating, stop as soon as it's mathematically decided
  while (kh < 5 || ka < 5) {
    if (kh < 5) { if (take("home", tH, kh)) h++; kh++; if (decidedInFive()) return { kicks, h, a }; }
    if (ka < 5) { if (take("away", tA, ka)) a++; ka++; if (decidedInFive()) return { kicks, h, a }; }
  }

  // sudden death: one kick each per round, decided the moment they differ
  let guard = 0;
  while (h === a && guard++ < 20) {
    if (take("home", tH, kh++)) h++;
    if (take("away", tA, ka++)) a++;
  }
  if (h === a) h++; // guarantee a winner
  return { kicks, h, a };
}

function makeSide(
  inp: SimInput,
  weight = 1,
): { side: SimSide; raw: TeamStrength } {
  const raw = computeStrength(inp.picks, inp.formationId);
  const withMentality = applyMentality(raw, inp.mentality, weight);
  const focusMod = attackFocusMod(inp.picks, inp.attackFocus, raw.overall);
  const scale = inp.strengthScale ?? 1;
  return {
    side: {
      id: inp.id,
      name: inp.name,
      strength: {
        attack: withMentality.attack * focusMod * scale,
        midfield: withMentality.midfield * scale,
        defense: withMentality.defense * scale,
        overall: withMentality.overall * scale,
      },
      picks: inp.picks,
      midCount: lineCount(inp.formationId, "MID"),
    },
    raw,
  };
}

export interface HalfSimResult {
  timeline: MatchEvent[];
  goals: Record<string, number>;
  strengths: Record<string, TeamStrength>;
  expelled: Record<string, string[]>; // players sent off, by playerId
}

/** Simulate the first half (kickoff..halftime) with the starting lineups. */
export function simulateFirstHalf(p1: SimInput, p2: SimInput): HalfSimResult {
  const a = makeSide(p1);
  const b = makeSide(p2);
  applyCounter(a.side, p1.mentality, b.side, p2.mentality);
  const rng = makeRng(Math.floor(Math.random() * 2 ** 31));
  const g1 = poisson(expectedGoals(a.side, b.side) * 0.5, rng);
  const g2 = poisson(expectedGoals(b.side, a.side) * 0.5, rng);
  const built = buildHalfTimeline(a.side, b.side, g1, g2, rng, 1);
  return {
    timeline: built.events,
    goals: { [p1.id]: g1, [p2.id]: g2 },
    strengths: { [p1.id]: a.raw, [p2.id]: b.raw },
    expelled: { [p1.id]: built.expelled.home, [p2.id]: built.expelled.away },
  };
}

export interface SecondHalfResult {
  timeline: MatchEvent[];
  goals: Record<string, number>; // cumulative total
  shootout: ShootoutKick[] | null;
  penaltyScore: Record<string, number> | null;
  strengths: Record<string, TeamStrength>;
  winnerId: string;
  summary: string;
}

/** Simulate the second half with the (possibly changed) lineups and decide the match. */
export function simulateSecondHalf(
  p1: SimInput,
  p2: SimInput,
  firstGoals: Record<string, number>,
  preExpelled: Record<string, string[]> = {},
): SecondHalfResult {
  const a = makeSide(p1);
  const b = makeSide(p2);
  applyCounter(a.side, p1.mentality, b.side, p2.mentality);
  const rng = makeRng(Math.floor(Math.random() * 2 ** 31));
  const g1b = poisson(expectedGoals(a.side, b.side) * 0.5, rng);
  const g2b = poisson(expectedGoals(b.side, a.side) * 0.5, rng);
  const built = buildHalfTimeline(a.side, b.side, g1b, g2b, rng, 2, {
    home: preExpelled[p1.id] ?? [],
    away: preExpelled[p2.id] ?? [],
  });
  const timeline = built.events;

  const t1 = (firstGoals[p1.id] ?? 0) + g1b;
  const t2 = (firstGoals[p2.id] ?? 0) + g2b;
  const goals: Record<string, number> = { [p1.id]: t1, [p2.id]: t2 };

  let winnerId: string;
  let summary: string;
  let shootout: ShootoutKick[] | null = null;
  let penaltyScore: Record<string, number> | null = null;

  if (t1 > t2) {
    winnerId = p1.id;
    summary = `${p1.name} venceu por ${t1} a ${t2}.`;
  } else if (t2 > t1) {
    winnerId = p2.id;
    summary = `${p2.name} venceu por ${t2} a ${t1}.`;
  } else {
    const so = runShootout(a.side, b.side, rng);
    shootout = so.kicks;
    penaltyScore = { [p1.id]: so.h, [p2.id]: so.a };
    winnerId = so.h > so.a ? p1.id : p2.id;
    const wName = winnerId === p1.id ? p1.name : p2.name;
    summary = `Empate em ${t1} a ${t2}. Nos pênaltis (${so.h} x ${so.a}), ${wName} levou a melhor!`;
  }

  return {
    timeline,
    goals,
    shootout,
    penaltyScore,
    strengths: { [p1.id]: a.raw, [p2.id]: b.raw },
    winnerId,
    summary,
  };
}

// ---- World Cup campaign ----

/** Stable string hash (FNV-1a) for deterministic per-team tactics. */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const WC_OPP_FORMATIONS = ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "4-1-4-1"];
const WC_OPP_MENTALITIES: Mentality[] = [
  "aura",
  "equilibrada",
  "retranca",
  "pressao",
  "posse",
  "contra_ataque",
];
const WC_OPP_FOCUS: AttackFocus[] = ["equilibrado", "lados", "meio"];

/**
 * Deterministic tactics for a World Cup opponent, so reading and countering
 * their style is a real decision (and stable for a given team across replays).
 */
export function wcOpponentTactics(team: Team): {
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
} {
  const h = hashStr(`${team.id}:${team.season}`);
  return {
    formationId: WC_OPP_FORMATIONS[h % WC_OPP_FORMATIONS.length],
    mentality: WC_OPP_MENTALITIES[(h >>> 8) % WC_OPP_MENTALITIES.length],
    attackFocus: WC_OPP_FOCUS[(h >>> 16) % WC_OPP_FOCUS.length],
  };
}

/** Turn a full team (players in formation-slot order) into a SimInput. */
export function simInputFromTeam(
  team: Team,
  formationId: string,
  mentality: Mentality,
): SimInput {
  const formation = getFormation(formationId)!;
  const picks: SquadPick[] = formation.slots.map((s, i) => {
    const player = team.players[i] ?? team.players[team.players.length - 1];
    return {
      slotId: s.id,
      player,
      fromTeamId: team.id,
      effectiveRating: player.rating,
    };
  });
  return { id: team.id, name: team.name, picks, formationId, mentality };
}

/**
 * Simulate one campaign match: a single full match with optional shootout for
 * knockout rounds. The player's mentality counts double.
 */
export function simulateGauntletMatch(
  you: SimInput,
  opp: SimInput,
  settleDrawWithShootout = false,
): GauntletResult {
  const a = makeSide(you, 2); // player's mentality has double weight
  const b = makeSide(opp, 1);
  applyCounter(a.side, you.mentality, b.side, opp.mentality);
  const rng = makeRng(Math.floor(Math.random() * 2 ** 31));

  const ga1 = poisson(expectedGoals(a.side, b.side) * 0.5, rng);
  const gb1 = poisson(expectedGoals(b.side, a.side) * 0.5, rng);
  const fh = buildHalfTimeline(a.side, b.side, ga1, gb1, rng, 1);

  const ga2 = poisson(expectedGoals(a.side, b.side) * 0.5, rng);
  const gb2 = poisson(expectedGoals(b.side, a.side) * 0.5, rng);
  const sh = buildHalfTimeline(a.side, b.side, ga2, gb2, rng, 2, fh.expelled);

  const youGoals = ga1 + ga2;
  const oppGoals = gb1 + gb2;
  let outcome: "win" | "draw" | "loss" =
    youGoals > oppGoals ? "win" : youGoals === oppGoals ? "draw" : "loss";
  let shootout: ShootoutKick[] | null = null;
  let penaltyScore: Record<string, number> | null = null;
  let winnerId: string | null =
    outcome === "win" ? you.id : outcome === "loss" ? opp.id : null;

  if (outcome === "draw" && settleDrawWithShootout) {
    const so = runShootout(a.side, b.side, rng);
    shootout = so.kicks;
    penaltyScore = { [you.id]: so.h, [opp.id]: so.a };
    winnerId = so.h > so.a ? you.id : opp.id;
    outcome = winnerId === you.id ? "win" : "loss";
  }

  return {
    youId: you.id,
    oppId: opp.id,
    oppName: opp.name,
    timeline: [...fh.events, ...sh.events],
    youGoals,
    oppGoals,
    outcome,
    shootout,
    penaltyScore,
    winnerId,
  };
}

// ---- Draft utilities ----

/** Slots the player has not filled yet. */
export function openSlots(player: PlayerPublic): string[] {
  const formation = player.formationId
    ? getFormation(player.formationId)
    : undefined;
  if (!formation) return [];
  const filled = new Set(player.picks.map((p) => p.slotId));
  return formation.slots.filter((s) => !filled.has(s.id)).map((s) => s.id);
}
