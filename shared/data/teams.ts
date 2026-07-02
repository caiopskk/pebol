import type { Team } from "../types.js";
import { CLUB_TEAM_SEEDS, withGeneratedClubBench } from "./seeds/clubSeeds.js";

export const TEAMS: Team[] = CLUB_TEAM_SEEDS.map(withGeneratedClubBench);

export function getTeam(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}
