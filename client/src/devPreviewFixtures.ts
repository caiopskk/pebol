import type { SquadPick, Team } from "../../shared/types.js";
import { effectiveRating, playerPositions } from "../../shared/engine.js";
import { getFormation, groupOf } from "../../shared/formations.js";
import { WC_DRAFT_TEAMS, wcOpponentTeam } from "../../shared/data/worldcup.js";
import type { CampaignState, CupGroupRow } from "./campaignTypes.js";
import type { DevPreviewKind } from "./devPreviews.js";

export type CampaignEndPreviewKind = "victory" | "gameover";

function previewRng(seed = 0) {
  const values = [0.12, 0.44, 0.73, 0.27, 0.91, 0.58, 0.36, 0.82];
  let i = seed;
  return () => values[i++ % values.length];
}

function teamFullName(team: { name: string; season?: string }): string {
  return team.season && !team.name.includes(team.season)
    ? `${team.name} ${team.season}`
    : team.name;
}

function groupRow(team: Pick<Team, "id" | "name" | "season">): CupGroupRow {
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

export function previewCampaignPicks(count = 11): SquadPick[] {
  const formation = getFormation("4-3-3")!;
  const used = new Set<string>();
  const pool = WC_DRAFT_TEAMS.flatMap((team) =>
    team.players.map((player) => ({ team, player })),
  ).sort((a, b) => b.player.rating - a.player.rating);

  return formation.slots.slice(0, count).map((slot) => {
    const found =
      pool.find(
        ({ team, player }) =>
          !used.has(`${team.id}:${player.name}`) &&
          playerPositions(player).some((pos) => groupOf(pos) === groupOf(slot.pos)),
      ) ??
      pool.find(({ team, player }) => !used.has(`${team.id}:${player.name}`)) ??
      pool[0];
    used.add(`${found.team.id}:${found.player.name}`);
    return {
      slotId: slot.id,
      player: found.player,
      fromTeamId: found.team.id,
      effectiveRating: effectiveRating(found.player, slot.pos),
    };
  });
}

function previewDraftTeam(picks: SquadPick[]): Team {
  const formation = getFormation("4-3-3")!;
  const filled = new Set(picks.map((pick) => pick.slotId));
  const openGroups = new Set(
    formation.slots
      .filter((slot) => !filled.has(slot.id))
      .map((slot) => groupOf(slot.pos)),
  );
  return (
    WC_DRAFT_TEAMS.find((team) =>
      team.players.some((player) =>
        playerPositions(player).some((pos) => openGroups.has(groupOf(pos))),
      ),
    ) ?? WC_DRAFT_TEAMS[0]
  );
}

function previewGroupRows(groupTeams: Team[]): CupGroupRow[] {
  return [
    {
      id: "you",
      name: "Seu time",
      played: 2,
      wins: 1,
      draws: 1,
      losses: 0,
      gf: 4,
      ga: 2,
      points: 4,
    },
    {
      ...groupRow(groupTeams[0]),
      played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      gf: 3,
      ga: 3,
      points: 3,
    },
    {
      ...groupRow(groupTeams[1]),
      played: 2,
      wins: 0,
      draws: 2,
      losses: 0,
      gf: 2,
      ga: 2,
      points: 2,
    },
    {
      ...groupRow(groupTeams[2]),
      played: 2,
      wins: 0,
      draws: 1,
      losses: 1,
      gf: 1,
      ga: 3,
      points: 1,
    },
  ];
}

function previewCompletedGroupRows(groupTeams: Team[]): CupGroupRow[] {
  return [
    {
      id: "you",
      name: "Seu time",
      played: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      gf: 7,
      ga: 3,
      points: 7,
    },
    {
      ...groupRow(groupTeams[0]),
      played: 3,
      wins: 2,
      draws: 0,
      losses: 1,
      gf: 5,
      ga: 4,
      points: 6,
    },
    {
      ...groupRow(groupTeams[1]),
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      gf: 4,
      ga: 4,
      points: 4,
    },
    {
      ...groupRow(groupTeams[2]),
      played: 3,
      wins: 0,
      draws: 0,
      losses: 3,
      gf: 2,
      ga: 7,
      points: 0,
    },
  ];
}

export function previewCampaignState(
  kind: Extract<DevPreviewKind, "cup-setup" | "cup-draft" | "cup-prematch">,
): CampaignState {
  const picks = kind === "cup-draft" ? previewCampaignPicks(7) : previewCampaignPicks();
  const groupTeams = [0, 1, 2].map((round) => wcOpponentTeam(round, previewRng(round)));
  const knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, previewRng(round)),
  );

  return {
    phase:
      kind === "cup-setup"
        ? "setup"
        : kind === "cup-draft"
          ? "draft"
          : "preMatch",
    mode: "normal",
    runId: "cup:preview",
    formationId: "4-3-3",
    mentality: "pressao",
    attackFocus: "meio",
    round: kind === "cup-prematch" ? 2 : 0,
    picks: kind === "cup-setup" ? [] : picks,
    currentTeam: kind === "cup-draft" ? previewDraftTeam(picks) : null,
    usedTeamIds: picks.map((pick) => pick.fromTeamId),
    selectedPlayer: null,
    selectedPickSlotId: null,
    currentOpp: kind === "cup-prematch" ? groupTeams[2] : null,
    lastResult: null,
    rerollsRemaining: 4,
    campaignGoals: { Ronaldo: 3, Messi: 2, Zidane: 1 },
    campaignAssists: { Messi: 3, Xavi: 2 },
    groupTeams,
    groupTable: previewGroupRows(groupTeams),
    groupQualified: null,
    groupQualifiedLabel: null,
    knockoutPath,
  };
}

export function previewCampaignEndState(kind: CampaignEndPreviewKind): CampaignState {
  const picks = previewCampaignPicks();
  const groupTeams = [0, 1, 2].map((round) => wcOpponentTeam(round, previewRng(round)));
  const knockoutPath = [3, 4, 5, 6, 7].map((round) =>
    wcOpponentTeam(round, previewRng(round)),
  );
  const isVictory = kind === "victory";
  const lastOpp = knockoutPath[3] ?? groupTeams[2];

  return {
    phase: isVictory ? "victory" : "gameover",
    mode: "normal",
    runId: `cup:preview:${kind}`,
    formationId: "4-3-3",
    mentality: "pressao",
    attackFocus: "meio",
    round: isVictory ? 8 : 6,
    picks,
    currentTeam: null,
    usedTeamIds: picks.map((pick) => pick.fromTeamId),
    selectedPlayer: null,
    selectedPickSlotId: null,
    currentOpp: null,
    lastResult: isVictory
      ? null
      : {
          youId: "you",
          oppId: lastOpp.id,
          oppName: teamFullName(lastOpp),
          timeline: [],
          youGoals: 2,
          oppGoals: 3,
          outcome: "loss",
          shootout: null,
          penaltyScore: null,
          winnerId: lastOpp.id,
        },
    rerollsRemaining: 0,
    campaignGoals: { Ronaldo: 7, Messi: 3, Zidane: 1 },
    campaignAssists: { Messi: 5, Xavi: 2 },
    groupTeams,
    groupTable: previewCompletedGroupRows(groupTeams),
    groupQualified: true,
    groupQualifiedLabel: "líder do grupo",
    knockoutPath,
  };
}
