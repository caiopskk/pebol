import type { CampaignState } from "../campaignTypes.js";

export function createInitialCampaignState(): CampaignState {
  return {
    phase: "setup",
    mode: "normal",
    runId: `cup:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    formationId: "4-3-3",
    mentality: "equilibrada",
    attackFocus: "equilibrado",
    round: 0,
    picks: [],
    currentTeam: null,
    usedTeamIds: [],
    selectedPlayer: null,
    selectedPickSlotId: null,
    currentOpp: null,
    lastResult: null,
    rerollsRemaining: 5,
    campaignGoals: {},
    campaignAssists: {},
    groupTeams: [],
    groupTable: [],
    groupQualified: null,
    groupQualifiedLabel: null,
    knockoutPath: [],
  };
}
