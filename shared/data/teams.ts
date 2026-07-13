import type { Team } from "../types.js";
import { CLUB_TEAM_SEEDS, withGeneratedClubBench } from "./seeds/clubSeeds.js";

export const RETIRED_HISTORICAL_CLUB_IDS = [
  "real-madrid-2013",
  "flamengo-2019",
  "barcelona-2011",
  "corinthians-2012",
  "real-madrid-2016",
  "milan-2007",
  "inter-2010",
  "bayern-2013",
  "liverpool-2019",
  "sao-paulo-2005",
  "man-united-1999",
  "ajax-1995",
  "porto-2004",
  "chelsea-2012",
  "boca-2000",
  "santos-1962",
] as const;

const retiredHistoricalClubIds = new Set<string>(RETIRED_HISTORICAL_CLUB_IDS);

export const TEAMS: Team[] = CLUB_TEAM_SEEDS
  .filter((team) => !retiredHistoricalClubIds.has(team.id))
  .map(withGeneratedClubBench);

export function getTeam(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}
