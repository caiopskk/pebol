import type {
  GauntletResult,
  Player,
  SquadPick,
  Team,
} from "../../../shared/types.js";
import { computeStrength } from "../../../shared/engine.js";
import { getFormation, groupOf, posLabel } from "../../../shared/formations.js";
import { wcOpponentTeam, WC_LADDER } from "../../../shared/data/worldcup.js";
import type {
  BracketRoundData,
  CampaignStatusData,
  CampaignStrengthData,
  CampaignSquadRow,
} from "../components/CupStatus.js";
import type { CampaignJourneyLeader } from "../components/CampaignEnd.js";
import type { CampaignState, CupGroupRow } from "../campaignTypes.js";
import { teamFullName } from "./teamImport.js";

export function campaignAvg(picks: SquadPick[]): string {
  if (!picks.length) return "";
  const avg = picks.reduce((sum, p) => sum + p.effectiveRating, 0) / picks.length;
  return `OVR ${Math.round(avg)}`;
}

export function campaignAvgNumber(picks: SquadPick[]): number {
  if (!picks.length) return 0;
  return Math.round(
    picks.reduce((sum, p) => sum + p.effectiveRating, 0) / picks.length,
  );
}

export function campaignStrengthData(c: CampaignState): CampaignStrengthData {
  if (c.mode === "hardcore") return { state: "hidden" };
  if (!c.picks.length) return { state: "empty" };
  const strength = computeStrength(c.picks, c.formationId);
  return {
    state: "ok",
    overall: strength.overall,
    attack: strength.attack,
    midfield: strength.midfield,
    defense: strength.defense,
  };
}

export function campaignSquadRowsData(c: CampaignState): CampaignSquadRow[] {
  const hideRating = c.mode === "hardcore";
  const formation = getFormation(c.formationId)!;
  const bySlot = new Map(c.picks.map((pick) => [pick.slotId, pick]));
  return formation.slots.map((slot) => {
    const pick = bySlot.get(slot.id);
    return {
      slotId: slot.id,
      pos: posLabel(slot.pos),
      posGroup: groupOf(slot.pos),
      name: pick?.player.name ?? null,
      rating: pick ? pick.effectiveRating : null,
      hideRating,
    };
  });
}

export function collectCampaignJourneyStats(
  result: GauntletResult,
  goals: Record<string, number>,
  assists: Record<string, number>,
) {
  for (const ev of result.timeline) {
    if (ev.type !== "goal" || ev.side !== "home") continue;
    if (ev.player) goals[ev.player] = (goals[ev.player] ?? 0) + 1;
    if (ev.assist) assists[ev.assist] = (assists[ev.assist] ?? 0) + 1;
  }
}

function topStat(source: Record<string, number>) {
  return (
    Object.entries(source).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] ?? null
  );
}

export function campaignJourneyLeadersData(
  c: CampaignState,
): CampaignJourneyLeader[] {
  const scorer = topStat(c.campaignGoals);
  const assist = topStat(c.campaignAssists);
  return [
    {
      label: "Artilheiro da campanha",
      name: scorer ? scorer[0] : null,
      val: scorer
        ? `${scorer[1]} gol${scorer[1] > 1 ? "s" : ""}`
        : "Sem destaque",
    },
    {
      label: "Garçom da campanha",
      name: assist ? assist[0] : null,
      val: assist
        ? `${assist[1]} assistência${assist[1] > 1 ? "s" : ""}`
        : "Sem destaque",
    },
  ];
}

export function knockoutBracketData(c: CampaignState): BracketRoundData[] {
  const rounds = ["16-avos", "Oitavas", "Quartas", "Semi", "Final"];
  const currentIdx =
    c.phase === "victory" ? rounds.length : Math.max(0, c.round - 3);
  return rounds.map((label, idx) => {
    const opp = c.knockoutPath[idx];
    const state: BracketRoundData["state"] =
      idx < currentIdx ? "done" : idx === currentIdx ? "next" : "";
    const oppLabel =
      opp && idx <= currentIdx
        ? `${opp.name}${opp.season ? ` ${opp.season}` : ""}`
        : idx < currentIdx
          ? "fase concluída"
          : "adversário oculto";
    return { label, state, oppLabel, showVs: idx === currentIdx };
  });
}

export function groupRow(team: Pick<Team, "id" | "name" | "season">): CupGroupRow {
  return {
    id: team.id,
    name: teamFullName(team),
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
  };
}

export function groupGoalDiff(row: CupGroupRow): number {
  return row.gf - row.ga;
}

export function groupTableSorted(rows: CupGroupRow[]): CupGroupRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      groupGoalDiff(b) - groupGoalDiff(a) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  );
}

export function updateGroupRow(
  rows: CupGroupRow[],
  id: string,
  gf: number,
  ga: number,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  row.played++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.wins++;
    row.points += 3;
  } else if (gf === ga) {
    row.draws++;
    row.points += 1;
  } else {
    row.losses++;
  }
}

export function recordGroupMatch(
  rows: CupGroupRow[],
  aId: string,
  bId: string,
  aGoals: number,
  bGoals: number,
) {
  updateGroupRow(rows, aId, aGoals, bGoals);
  updateGroupRow(rows, bId, bGoals, aGoals);
}

export function teamAvg(team: Team): number {
  return Math.round(
    team.players.reduce((sum, p) => sum + p.rating, 0) /
      Math.max(1, team.players.length),
  );
}

export function randomGroupScore(a: Team, b: Team): [number, number] {
  const baseA =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(a) - teamAvg(b)) / 18));
  const baseB =
    0.85 + Math.max(-0.55, Math.min(0.75, (teamAvg(b) - teamAvg(a)) / 18));
  const goals = (base: number) => {
    const roll = Math.random() + Math.random() + Math.random();
    return Math.max(0, Math.min(5, Math.floor(roll * base)));
  };
  return [goals(baseA), goals(baseB)];
}

export function setupCampaignGroup(c: CampaignState) {
  if (c.groupTeams.length) return;
  c.groupTeams = [0, 1, 2].map((i) => wcOpponentTeam(i, Math.random));
  c.groupTable = [
    groupRow({ id: "you", name: "Seu time", season: "" }),
    ...c.groupTeams.map(groupRow),
  ];
}

export function simulateOtherGroupFixture(c: CampaignState, matchday: number) {
  const [a, b, d] = c.groupTeams;
  const fixtures: Array<[Team, Team]> = [
    [b, d],
    [a, d],
    [a, b],
  ];
  const fixture = fixtures[matchday];
  if (!fixture) return;
  const [ga, gb] = randomGroupScore(fixture[0], fixture[1]);
  recordGroupMatch(c.groupTable, fixture[0].id, fixture[1].id, ga, gb);
}

export function campaignRank(c: CampaignState): number {
  return groupTableSorted(c.groupTable).findIndex((row) => row.id === "you") + 1;
}

export function bestThirdQualifies(row: CupGroupRow): boolean {
  return row.points >= 4 || (row.points === 3 && groupGoalDiff(row) >= 0);
}

export function campaignQualificationLabel(c: CampaignState): string {
  const sorted = groupTableSorted(c.groupTable);
  const youRow = sorted.find((row) => row.id === "you")!;
  const rank = sorted.findIndex((row) => row.id === "you") + 1;
  if (rank <= 2) return `${rank}º colocado do grupo`;
  if (rank === 3 && bestThirdQualifies(youRow))
    return "3º colocado entre os 8 melhores terceiros";
  return `${rank}º colocado do grupo`;
}

export function setupKnockoutPath(c: CampaignState) {
  if (c.knockoutPath.length) return;
  c.knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, Math.random),
  );
}

export function campaignStageLabel(round: number): string {
  return WC_LADDER[round]?.label ?? "Copa do Mundo";
}

export function campaignStatusData(c: CampaignState): CampaignStatusData {
  if (!c.groupTable.length) return { kind: "empty" };
  const inGroup = c.round < 3 || c.groupQualified === false;
  if (inGroup) {
    const rank = campaignRank(c);
    const status =
      c.groupQualified === null
        ? `${rank}º no grupo neste momento`
        : c.groupQualified
          ? `Classificado: ${c.groupQualifiedLabel}`
          : `Eliminado: ${c.groupQualifiedLabel}`;
    return {
      kind: "group",
      table: {
        status,
        rows: groupTableSorted(c.groupTable).map((row) => ({
          id: row.id,
          name: row.name,
          played: row.played,
          points: row.points,
          goalDiff: groupGoalDiff(row),
          gf: row.gf,
        })),
      },
    };
  }
  if (!c.knockoutPath.length) return { kind: "empty" };
  return { kind: "knockout", bracket: knockoutBracketData(c) };
}

export function campaignMatchAchievementIds(r: GauntletResult): string[] {
  const ids: string[] = [];
  const goals = new Map<string, number>();
  const assists = new Map<string, number>();
  let youHalfGoals = 0;
  let oppHalfGoals = 0;
  let youRedCard = false;
  for (const ev of r.timeline) {
    if (ev.type === "card" && ev.card === "red" && ev.side === "home")
      youRedCard = true;
    if (ev.type !== "goal") continue;
    if (ev.minute <= 45) {
      if (ev.side === "home") youHalfGoals++;
      if (ev.side === "away") oppHalfGoals++;
    }
    if (ev.side !== "home") continue;
    if (ev.player) goals.set(ev.player, (goals.get(ev.player) ?? 0) + 1);
    if (ev.assist) assists.set(ev.assist, (assists.get(ev.assist) ?? 0) + 1);
  }
  const totalAssists = [...assists.values()].reduce((sum, n) => sum + n, 0);
  if (r.youGoals > 0) ids.push("first_goal");
  if (r.outcome === "win") ids.push("first_win");
  if (r.outcome === "win" && r.oppGoals === 0) ids.push("clean_sheet");
  if (r.penaltyScore && r.outcome === "win") ids.push("penalty_win");
  if ([...goals.values()].some((n) => n >= 3)) ids.push("hat_trick");
  if (totalAssists >= 3) ids.push("assist_master");
  if (r.outcome === "win" && r.youGoals - r.oppGoals >= 3) ids.push("big_win");
  if (r.outcome === "win" && youHalfGoals < oppHalfGoals)
    ids.push("comeback_win");
  if (r.outcome === "win" && youRedCard) ids.push("red_card_win");
  return ids;
}

export function campaignPickSlot(
  c: CampaignState,
  slotId: string,
  player: Player,
) {
  const slot = getFormation(c.formationId)?.slots.find((s) => s.id === slotId);
  c.picks.push({
    slotId,
    player,
    fromTeamId: c.currentTeam!.id,
    effectiveRating: slot ? player.rating : player.rating,
  });
}
