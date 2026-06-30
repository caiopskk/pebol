import { deleteTeam, initDb } from "../server/src/db.js";
import { WC_DRAFT_TEAMS } from "../shared/data/worldcup.js";

declare const process: { exit(code?: number): never };

const teams2026 = WC_DRAFT_TEAMS.filter(
  (team) => team.season === "2026" && team.league === "Copa 2026",
);

async function main() {
  await initDb();

  for (const team of teams2026) {
    await deleteTeam(team.id);
  }

  await initDb();
  console.log(`[db] synced ${teams2026.length} Copa 2026 national teams`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
