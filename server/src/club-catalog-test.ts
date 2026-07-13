import { CLUB_ALIASES } from "../../shared/data/aliases.js";
import { RETIRED_HISTORICAL_CLUB_IDS, TEAMS } from "../../shared/data/teams.js";
import { LEAGUE_STRUCTURES } from "../../shared/leagueStructures.js";
import { initDb, listManagerStartTeams } from "./db.js";

const retiredIds = new Set<string>(RETIRED_HISTORICAL_CLUB_IDS);
const missingAliases = TEAMS.filter((team) => !CLUB_ALIASES[team.id]);
const leakedHistoricalTeams = TEAMS.filter((team) => retiredIds.has(team.id));
const leakedHistoricalDivisions = LEAGUE_STRUCTURES.flatMap((league) => league.divisions)
  .filter((division) => division.id.startsWith("historica"));
const playableIds = new Set(
  LEAGUE_STRUCTURES.flatMap((league) => league.divisions)
    .flatMap((division) => division.teams)
    .map((team) => team.playableTeamId)
    .filter((id): id is string => Boolean(id)),
);
const unknownPlayableIds = [...playableIds].filter((id) => !TEAMS.some((team) => team.id === id));
await initDb();
const dbTeams = await listManagerStartTeams();
const dbTeamById = new Map(dbTeams.map((team) => [team.id, team]));
const staleHistoricalDbTeams = dbTeams.filter((team) => retiredIds.has(team.id));
const staleDbAliases = TEAMS.filter((team) => dbTeamById.get(team.id)?.name !== CLUB_ALIASES[team.id]);

const failures = [
  ...missingAliases.map((team) => `Missing alias: ${team.id}`),
  ...leakedHistoricalTeams.map((team) => `Historical club still playable: ${team.id}`),
  ...leakedHistoricalDivisions.map((division) => `Historical division still present: ${division.id}`),
  ...unknownPlayableIds.map((id) => `Unknown playableTeamId: ${id}`),
  ...staleHistoricalDbTeams.map((team) => `Historical club still stored: ${team.id}`),
  ...staleDbAliases.map((team) => `Database alias is stale: ${team.id}`),
];

if (failures.length) {
  throw new Error(`Club catalog validation failed:\n${failures.join("\n")}`);
}

console.log(`Club catalog OK: ${TEAMS.length} playable clubs, all with public aliases.`);
