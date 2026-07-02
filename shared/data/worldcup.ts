import type { Team, Player } from "../types.js";
import {
  WC_BOSS,
  WC_DRAFT_TEAMS,
  WC_OPPONENT_TEAMS,
} from "./seeds/nationalTeamSeeds.js";
export {
  WC_BOSS,
  WC_DRAFT_TEAMS,
  WC_OPPONENT_TEAMS,
} from "./seeds/nationalTeamSeeds.js";

// ---------------- Opponent ladder (escalating difficulty) ----------------
export interface LadderRound {
  label: string;          // shown in the progress bar / pre-match
  overRange: [number, number];
  opponentIds: string[];  // authored teams eligible for this campaign round
}

// 8 matches: 3 group-stage fixtures, then Round of 32 through the final.
// The last one is the authored boss; every other round draws from fixed squads.
export const WC_LADDER: LadderRound[] = [
  { label: "Fase de Grupos — Jogo 1", overRange: [70, 76], opponentIds: ["wc-arabia-1994", "wc-costa-rica-2014", "wc-canada-2026", "wc-catar-2026", "wc-haiti-2026", "wc-curacao-2026", "wc-africa-do-sul-2026", "wc-nova-zelandia-2026", "wc-panama-2026", "wc-jordania-2026"] },
  { label: "Fase de Grupos — Jogo 2", overRange: [72, 78], opponentIds: ["wc-gana-2010", "wc-nigeria-1994", "wc-japao-2018", "wc-mexico-1986", "wc-mexico-2026", "wc-coreia-do-sul-2026", "wc-australia-2026", "wc-bosnia-2026", "wc-tunisia-2026", "wc-cabo-verde-2026", "wc-iraque-2026", "wc-uzbequistao-2026"] },
  { label: "Fase de Grupos — Jogo 3", overRange: [74, 80], opponentIds: ["wc-eua-2002", "wc-marrocos-2022", "wc-croacia-2018", "wc-suecia-1994", "wc-escocia-2026", "wc-paraguai-2026", "wc-tchequia-2026", "wc-arabia-saudita-2026", "wc-egito-2026", "wc-ira-2026", "wc-gana-2026"] },
  { label: "16-avos de Final", overRange: [79, 83], opponentIds: ["wc-belgica-2018", "wc-suecia-1994", "wc-portugal-2006", "wc-colombia-2014", "wc-marrocos-2026", "wc-eua-2026", "wc-suica-2026", "wc-japao-2026", "wc-rd-congo-2026", "wc-austria-2026", "wc-argelia-2026", "wc-colombia-2026"] },
  { label: "Oitavas de Final", overRange: [82, 85], opponentIds: ["wc-holanda-2010", "wc-inglaterra-1990", "wc-uruguai-2010", "wc-franca-2006", "wc-turquia-2026", "wc-equador-2026", "wc-cote-divoire-2026", "wc-belgica-2026", "wc-suecia-2026", "wc-uruguai-2026", "wc-senegal-2026", "wc-croacia-2026"] },
  { label: "Quartas de Final", overRange: [86, 88], opponentIds: ["wc-croacia-2018", "wc-espanha-2022", "wc-argentina-1998", "wc-brasil-1994", "wc-suica-2026", "wc-marrocos-2026", "wc-alemanha-2026", "wc-paises-baixos-2026", "wc-portugal-2026", "wc-inglaterra-2026", "wc-noruega-2026"] },
  { label: "Semifinal", overRange: [89, 92], opponentIds: ["wc-espanha-2010", "wc-alemanha-1990", "wc-franca-1998", "wc-argentina-2022", "wc-brasil-2026", "wc-alemanha-2026", "wc-franca-2026", "wc-argentina-2026", "wc-espanha-2026"] },
  { label: "A Grande Final", overRange: [93, 96], opponentIds: [WC_BOSS.id] },
];

const WC_OPPONENT_BY_ID = new Map(
  [...WC_DRAFT_TEAMS, ...WC_OPPONENT_TEAMS, WC_BOSS].map((team) => [team.id, team]),
);

// Pool of all-time best / iconic sides eligible to be the final boss. The final
// draws one of these (so it's not always Brazil 1970) and buffs it slightly, since
// the final must be hard.
const WC_FINALISTS: string[] = [
  WC_BOSS.id, // Brasil 1970
  "wc-brasil-1958",
  "wc-brasil-2002",
  "wc-brasil-1982",
  "wc-alemanha-1974",
  "wc-alemanha-2014",
  "wc-alemanha-1990",
  "wc-espanha-2010",
  "wc-hungria-1954",
  "wc-franca-2006",
  "wc-franca-1998",
  "wc-argentina-1986",
  "wc-argentina-2022",
  "wc-argentina-2026",
  "wc-brasil-2026",
  "wc-alemanha-2026",
  "wc-franca-2026",
  "wc-espanha-2026",
  "wc-portugal-2026",
  "wc-inglaterra-2026",
  "wc-paises-baixos-2026",
  "wc-noruega-2026",
  "wc-suica-2026",
  "wc-turquia-2026",
  "wc-marrocos-2026",
  "wc-italia-2006",
  "wc-holanda-1974",
];

const FINAL_BUFF = 4; // per-player rating bump for the final, capped at 99

function cloneTeam(team: Team, league = team.league): Team {
  return {
    ...team,
    league,
    players: team.players.map((player) => ({ ...player })),
    bench: team.bench?.map((player) => ({ ...player })),
  };
}

/** Return a clone with every rating bumped by `amount` (capped at 99). */
function buffTeam(team: Team, amount: number): Team {
  const bump = (p: Player) => ({ ...p, rating: Math.min(99, p.rating + amount) });
  return {
    ...team,
    players: team.players.map(bump),
    bench: team.bench?.map(bump),
  };
}

/** Pick an authored national team for a campaign round (0-based). */
export function wcOpponentTeam(round: number, rng: () => number): Team {
  const cfg = WC_LADDER[round];
  if (round >= WC_LADDER.length - 1) {
    // Final: draw one of the all-time greats and buff it (hard final, with variety).
    const pool = WC_FINALISTS.map((id) => WC_OPPONENT_BY_ID.get(id)).filter(
      (team): team is Team => Boolean(team),
    );
    const base = pool[Math.floor(rng() * pool.length)] ?? WC_BOSS;
    return buffTeam(cloneTeam(base, cfg.label), FINAL_BUFF);
  }
  const teams = cfg.opponentIds
    .map((id) => WC_OPPONENT_BY_ID.get(id))
    .filter((team): team is Team => Boolean(team));
  const team = teams[Math.floor(rng() * teams.length)] ?? WC_BOSS;
  return cloneTeam(team, cfg.label);
}
