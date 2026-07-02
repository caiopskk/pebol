import type {
  AttackFocus,
  ManagerFixture,
  ManagerPlayer,
  ManagerRoundResult,
  ManagerSave,
  ManagerStanding,
  Mentality,
  MatchEvent,
  Player,
  SquadPick,
  TeamStrength,
} from "../../shared/types.js";
import { getFormation } from "../../shared/formations.js";
import {
  computeStrength,
  effectiveRating,
  simInputFromTeam,
  simulateGauntletMatch,
  type SimInput,
} from "../../shared/engine.js";
import type { Team } from "../../shared/types.js";
import { generateDoubleRoundRobinFixtures } from "../../shared/leagueStructures.js";
import {
  advanceManagerRound,
  applyManagerMatchResult,
  getManagerSave,
  getManagerSquad,
  getManagerStandings,
} from "./db.js";

const AI_FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "4-1-4-1", "3-5-2"];
const AI_MENTALITIES: Mentality[] = [
  "equilibrada",
  "pressao",
  "posse",
  "contra_ataque",
  "retranca",
];
const AI_FOCUS: AttackFocus[] = ["equilibrado", "lados", "meio"];

function hashStr(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tacticFor(teamId: string): {
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
} {
  const h = hashStr(teamId);
  return {
    formationId: AI_FORMATIONS[h % AI_FORMATIONS.length],
    mentality: AI_MENTALITIES[(h >>> 8) % AI_MENTALITIES.length],
    attackFocus: AI_FOCUS[(h >>> 16) % AI_FOCUS.length],
  };
}

function playerOnly(player: ManagerPlayer): Player {
  return {
    name: player.name,
    pos: player.pos,
    altPositions: player.altPositions,
    rating: player.rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
  };
}

function autoTeam(players: ManagerPlayer[], teamId: string, teamName: string, formationId: string): Team {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const slots = getFormation(formationId)?.slots ?? getFormation("4-3-3")!.slots;
  const used = new Set<string>();
  const starters = slots.map((slot) => {
    let best: ManagerPlayer | undefined;
    let bestScore = -Infinity;
    for (const candidate of sorted) {
      if (used.has(candidate.id)) continue;
      const score = effectiveRating(candidate, slot.pos);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    const chosen = best ?? sorted.find((p) => !used.has(p.id)) ?? sorted[0];
    used.add(chosen.id);
    return playerOnly(chosen);
  });
  const bench = sorted.filter((p) => !used.has(p.id)).slice(0, 7).map(playerOnly);
  return { id: teamId, name: teamName, season: "", league: "Manager", players: starters, bench };
}

function userInput(save: ManagerSave, squad: ManagerPlayer[]): SimInput {
  const formation = getFormation(save.formationId) ?? getFormation("4-3-3")!;
  let starters = squad.filter((p) => p.isStarter && p.lineupSlotId);
  if (starters.length !== 11) {
    const team = autoTeam(squad, save.teamId, save.teamName, save.formationId);
    return simInputFromTeam(team, save.formationId, save.mentality);
  }
  const bySlot = new Map(starters.map((p) => [p.lineupSlotId!, p]));
  const picks: SquadPick[] = formation.slots.map((slot) => {
    const player = bySlot.get(slot.id) ?? starters[0];
    return {
      slotId: slot.id,
      player: playerOnly(player),
      fromTeamId: player.teamId,
      effectiveRating: effectiveRating(player, slot.pos),
    };
  });
  return {
    id: save.teamId,
    name: save.teamName,
    picks,
    formationId: save.formationId,
    mentality: save.mentality,
    attackFocus: save.attackFocus,
  };
}

function aiInput(teamId: string, teamName: string, players: ManagerPlayer[]): SimInput {
  const tactic = tacticFor(teamId);
  const team = autoTeam(players, teamId, teamName, tactic.formationId);
  return {
    ...simInputFromTeam(team, tactic.formationId, tactic.mentality),
    attackFocus: tactic.attackFocus,
  };
}

export function managerSchedule(standings: ManagerStanding[], round: number): ManagerFixture[] {
  return generateDoubleRoundRobinFixtures(
    standings.map((s) => ({ id: s.teamId, name: s.teamName })),
  )
    .filter((fixture) => fixture.round === round)
    .map(({ round, homeTeamId, awayTeamId, homeName, awayName }) => ({
      round,
      homeTeamId,
      awayTeamId,
      homeName,
      awayName,
    }));
}

export async function managerNextOpponentStrength(save: ManagerSave): Promise<TeamStrength | null> {
  const standings = await getManagerStandings(save.id);
  const fixture = managerSchedule(standings, save.round).find(
    (f) => f.homeTeamId === save.teamId || f.awayTeamId === save.teamId,
  );
  if (!fixture) return null;
  const oppId = fixture.homeTeamId === save.teamId ? fixture.awayTeamId : fixture.homeTeamId;
  const opp = standings.find((s) => s.teamId === oppId);
  if (!opp) return null;
  const squad = (await getManagerSquad(save.id, oppId)).filter((p) => p.teamId === oppId);
  const input = aiInput(oppId, opp.teamName, squad);
  return input.picks.length
    ? computeStrength(input.picks, tacticFor(oppId).formationId)
    : null;
}

export async function playManagerRound(userId: string): Promise<ManagerRoundResult | { error: string }> {
  const save = await getManagerSave(userId);
  if (!save) return { error: "Crie uma carreira antes de jogar a rodada." };
  const standings = await getManagerStandings(save.id);
  const fixtures = managerSchedule(standings, save.round);
  if (!fixtures.length) return { error: "Calendário indisponível para esta liga." };

  const allPlayers = await getManagerSquad(save.id);
  const byTeam = new Map<string, ManagerPlayer[]>();
  for (const player of allPlayers) {
    const list = byTeam.get(player.teamId) ?? [];
    list.push(player);
    byTeam.set(player.teamId, list);
  }

  let userTimeline: MatchEvent[] = [];
  let userGoals: Record<string, number> = {};
  let summary = "";
  const played: ManagerRoundResult["fixtures"] = [];

  for (const fixture of fixtures) {
    const homeStanding = standings.find((s) => s.teamId === fixture.homeTeamId);
    const awayStanding = standings.find((s) => s.teamId === fixture.awayTeamId);
    if (!homeStanding || !awayStanding) continue;
    const homeInput =
      fixture.homeTeamId === save.teamId
        ? userInput(save, byTeam.get(save.teamId) ?? [])
        : aiInput(fixture.homeTeamId, fixture.homeName, byTeam.get(fixture.homeTeamId) ?? []);
    const awayInput =
      fixture.awayTeamId === save.teamId
        ? userInput(save, byTeam.get(save.teamId) ?? [])
        : aiInput(fixture.awayTeamId, fixture.awayName, byTeam.get(fixture.awayTeamId) ?? []);
    const result = simulateGauntletMatch(homeInput, awayInput, false);
    const homeGoals = result.youGoals;
    const awayGoals = result.oppGoals;
    await applyManagerMatchResult(save, fixture.homeTeamId, fixture.awayTeamId, homeGoals, awayGoals);
    played.push({ ...fixture, homeGoals, awayGoals });
    if (fixture.homeTeamId === save.teamId || fixture.awayTeamId === save.teamId) {
      userTimeline = result.timeline;
      userGoals = {
        [fixture.homeTeamId]: homeGoals,
        [fixture.awayTeamId]: awayGoals,
      };
      const youGoals = fixture.homeTeamId === save.teamId ? homeGoals : awayGoals;
      const oppGoals = fixture.homeTeamId === save.teamId ? awayGoals : homeGoals;
      summary =
        youGoals > oppGoals
          ? `Vitória por ${youGoals} a ${oppGoals}.`
          : youGoals === oppGoals
            ? `Empate em ${youGoals} a ${oppGoals}.`
            : `Derrota por ${oppGoals} a ${youGoals}.`;
    }
  }

  const maxRound = Math.max(1, (standings.length - 1) * 2);
  const nextRound = save.round >= maxRound ? 1 : save.round + 1;
  const nextSave = await advanceManagerRound(save.id, nextRound);
  return {
    save: nextSave ?? save,
    timeline: userTimeline,
    goals: userGoals,
    fixtures: played,
    standings: await getManagerStandings(save.id),
    summary,
  };
}
