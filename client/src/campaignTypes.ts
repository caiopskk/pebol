import type {
  AttackFocus,
  GauntletResult,
  Mentality,
  SquadPick,
  Team,
} from "../../shared/types.js";

export type CampaignPhase =
  | "setup"
  | "draft"
  | "preMatch"
  | "match"
  | "gameover"
  | "victory";

export type CampaignMode = "normal" | "hardcore";

export interface CupGroupRow {
  id: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
}

export interface CampaignState {
  phase: CampaignPhase;
  mode: CampaignMode;
  runId: string;
  formationId: string;
  mentality: Mentality;
  attackFocus: AttackFocus;
  round: number;
  picks: SquadPick[];
  currentTeam: Team | null;
  usedTeamIds: string[];
  selectedPlayer: string | null;
  selectedPickSlotId: string | null;
  currentOpp: Team | null;
  lastResult: GauntletResult | null;
  rerollsRemaining: number;
  campaignGoals: Record<string, number>;
  campaignAssists: Record<string, number>;
  groupTeams: Team[];
  groupTable: CupGroupRow[];
  groupQualified: boolean | null;
  groupQualifiedLabel: string | null;
  knockoutPath: Team[];
}
