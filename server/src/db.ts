import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { TEAMS } from "../../shared/data/teams.js";
import {
  WC_DRAFT_TEAMS,
  WC_BOSS,
  WC_OPPONENT_TEAMS,
} from "../../shared/data/worldcup.js";
import { CLUB_ALIASES } from "../../shared/data/aliases.js";
import { buildLevelProgress, type LevelProgress } from "../../shared/progression.js";
import type { Team, Player, Position } from "../../shared/types.js";

// Turso/libSQL in production (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN), local file in dev.
const url = process.env.TURSO_DATABASE_URL || "file:./data/pebol.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
if (url.startsWith("file:")) {
  try {
    mkdirSync(url.replace(/^file:/, "").replace(/[/\\][^/\\]+$/, "") || ".", {
      recursive: true,
    });
  } catch {
    /* dir already exists */
  }
}
export const db: Client = createClient(
  authToken ? { url, authToken } : { url },
);

export type TeamKind = "club" | "national";
export interface DbTeam extends Team {
  kind: TeamKind;
  ownerId: string | null; // null = official team (only admins edit)
  alias: string; // copyright-safe generic name shown to non-admins (clubs)
}
export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  sortOrder: number;
}
export interface AchievementProgress extends Achievement {
  unlockedAt: number | null;
}
export interface UserProgress extends LevelProgress {
  achievementXp: number;
  activityXp: number;
}
export interface LeaderboardEntry extends UserProgress {
  userId: string;
  username: string;
  rank: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_goal",
    title: "Primeiro grito",
    description: "Marque seu primeiro gol em uma partida.",
    category: "Partida",
    points: 10,
    sortOrder: 10,
  },
  {
    id: "first_win",
    title: "Primeira vitória",
    description: "Vença uma partida em qualquer modo.",
    category: "Partida",
    points: 20,
    sortOrder: 20,
  },
  {
    id: "clean_sheet",
    title: "Muralha",
    description: "Vença uma partida sem sofrer gols.",
    category: "Partida",
    points: 25,
    sortOrder: 30,
  },
  {
    id: "penalty_win",
    title: "Sangue frio",
    description: "Vença uma decisão por pênaltis.",
    category: "Partida",
    points: 30,
    sortOrder: 40,
  },
  {
    id: "hat_trick",
    title: "Hat-trick",
    description: "Faça três gols com o mesmo jogador em uma partida.",
    category: "Partida",
    points: 35,
    sortOrder: 50,
  },
  {
    id: "assist_master",
    title: "Garçom da rodada",
    description: "Dê três assistências na mesma partida.",
    category: "Partida",
    points: 30,
    sortOrder: 60,
  },
  {
    id: "strong_draft",
    title: "Elenco pesado",
    description: "Monte um time com overall 85 ou mais.",
    category: "Draft",
    points: 25,
    sortOrder: 70,
  },
  {
    id: "beat_machine",
    title: "Sem bug no sistema",
    description: "Vença uma partida contra a máquina.",
    category: "Draft",
    points: 20,
    sortOrder: 80,
  },
  {
    id: "hardcore_win",
    title: "No escuro",
    description: "Vença uma partida no modo Hardcore.",
    category: "Draft",
    points: 25,
    sortOrder: 90,
  },
  {
    id: "custom_team",
    title: "Dono da prancheta",
    description: "Crie um time personalizado.",
    category: "Gestão",
    points: 20,
    sortOrder: 100,
  },
  {
    id: "json_import",
    title: "Olheiro digital",
    description: "Importe times usando um arquivo JSON.",
    category: "Gestão",
    points: 25,
    sortOrder: 110,
  },
  {
    id: "group_escape",
    title: "Passou no sufoco",
    description: "Classifique-se na fase de grupos da Copa do Mundo.",
    category: "Copa",
    points: 30,
    sortOrder: 120,
  },
  {
    id: "group_escape_hardcore",
    title: "Classificado no escuro",
    description: "Passe da fase de grupos da Copa do Mundo no modo Hardcore.",
    category: "Copa",
    points: 45,
    sortOrder: 125,
  },
  {
    id: "world_champion",
    title: "Campeão do mundo",
    description: "Vença a campanha da Copa do Mundo.",
    category: "Copa",
    points: 100,
    sortOrder: 130,
  },
  {
    id: "world_champion_hardcore",
    title: "Lenda sem mapa",
    description: "Vença a Copa do Mundo no modo Hardcore.",
    category: "Copa",
    points: 150,
    sortOrder: 135,
  },
  {
    id: "cup_first_win",
    title: "Primeiro passo na Copa",
    description: "Vença uma partida na campanha da Copa do Mundo.",
    category: "Copa",
    points: 25,
    sortOrder: 140,
  },
  {
    id: "round_32_clear",
    title: "Sobreviveu ao funil",
    description: "Passe pelos 16-avos de final da Copa do Mundo.",
    category: "Copa",
    points: 35,
    sortOrder: 150,
  },
  {
    id: "quarterfinalist",
    title: "Entre os oito",
    description: "Chegue às quartas de final da Copa do Mundo.",
    category: "Copa",
    points: 45,
    sortOrder: 160,
  },
  {
    id: "semifinalist",
    title: "Quase lá",
    description: "Chegue à semifinal da Copa do Mundo.",
    category: "Copa",
    points: 60,
    sortOrder: 170,
  },
  {
    id: "finalist",
    title: "No jogo da taça",
    description: "Chegue à final da Copa do Mundo.",
    category: "Copa",
    points: 75,
    sortOrder: 180,
  },
  {
    id: "perfect_group",
    title: "Grupo perfeito",
    description: "Vença os 3 jogos da fase de grupos da Copa do Mundo.",
    category: "Copa",
    points: 50,
    sortOrder: 190,
  },
  {
    id: "cup_hardcore_first_win",
    title: "Vitória sem números",
    description: "Vença uma partida da Copa do Mundo no modo Hardcore.",
    category: "Copa Hardcore",
    points: 40,
    sortOrder: 200,
  },
  {
    id: "big_win",
    title: "Goleada moral",
    description: "Vença uma partida por 3 ou mais gols de diferença.",
    category: "Partida",
    points: 40,
    sortOrder: 210,
  },
  {
    id: "comeback_win",
    title: "Virada de roteiro",
    description: "Vença uma partida depois de estar perdendo no intervalo.",
    category: "Partida",
    points: 45,
    sortOrder: 220,
  },
  {
    id: "red_card_win",
    title: "Com um a menos",
    description: "Vença uma partida após receber cartão vermelho.",
    category: "Partida",
    points: 45,
    sortOrder: 230,
  },
];

/** What a non-admin sees: official clubs get their generic alias; nationals and the
 *  user's own teams keep their real name. */
export function maskTeamName(t: DbTeam, isAdmin: boolean): string {
  if (isAdmin) return t.name;
  if (t.ownerId) return t.name; // a user's own team is never masked for its owner
  return t.kind === "club" ? t.alias || t.name : t.name;
}

export async function initDb(): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user', created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, season TEXT NOT NULL DEFAULT '',
        league TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'club',
        alias TEXT NOT NULL DEFAULT '', owner_id TEXT, created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY, team_id TEXT NOT NULL, name TEXT NOT NULL, pos TEXT NOT NULL,
        rating INTEGER NOT NULL, alt_pos TEXT NOT NULL DEFAULT '',
        is_bench INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
        category TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT NOT NULL, achievement_id TEXT NOT NULL, unlocked_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, achievement_id))`,
      `CREATE TABLE IF NOT EXISTS user_xp_events (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, source_key TEXT NOT NULL,
        amount INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
        UNIQUE(user_id, source_key))`,
      `CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)`,
      `CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_xp_events_user ON user_xp_events(user_id)`,
    ],
    "write",
  );
  await migrateDb();
  await seedAchievements();
  await seedIfEmpty();
}

async function migrateDb(): Promise<void> {
  try {
    await db.execute(
      "ALTER TABLE players ADD COLUMN alt_pos TEXT NOT NULL DEFAULT ''",
    );
  } catch (err) {
    const msg = (
      err instanceof Error ? err.message : String(err)
    ).toLowerCase();
    if (!msg.includes("duplicate column")) throw err;
  }
}

async function seedAchievements(): Promise<void> {
  for (const a of ACHIEVEMENTS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO achievements (id,title,description,category,points,sort_order) VALUES (?,?,?,?,?,?)`,
      args: [a.id, a.title, a.description, a.category, a.points, a.sortOrder],
    });
  }
}

async function seedIfEmpty(): Promise<void> {
  const r = await db.execute("SELECT count(*) AS c FROM teams");
  if (Number(r.rows[0].c) > 0) return;
  const now = Date.now();
  for (const t of TEAMS)
    await writeTeam(t.id, t, "club", null, now, CLUB_ALIASES[t.id] ?? t.name);
  const nationalTeams = [...WC_DRAFT_TEAMS, ...WC_OPPONENT_TEAMS, WC_BOSS];
  for (const t of nationalTeams)
    await writeTeam(t.id, t, "national", null, now, t.name);
  console.log(
    `[db] seeded ${TEAMS.length} clubs + ${nationalTeams.length} national teams`,
  );
}

// ---- team payload (what the CRUD accepts) ----
export interface TeamInput {
  name: string;
  season?: string;
  league?: string;
  alias?: string;
  players: Player[];
  bench?: Player[];
}

async function writeTeam(
  id: string,
  t: TeamInput,
  kind: TeamKind,
  ownerId: string | null,
  now: number,
  alias: string,
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO teams (id,name,season,league,kind,alias,owner_id,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    args: [
      id,
      t.name,
      t.season ?? "",
      t.league ?? "",
      kind,
      alias,
      ownerId,
      now,
    ],
  });
  await writePlayers(id, t);
}

async function writePlayers(teamId: string, t: TeamInput): Promise<void> {
  const rows = [
    ...t.players.map((p, i) => ({ p, bench: 0, i })),
    ...(t.bench ?? []).map((p, i) => ({ p, bench: 1, i })),
  ];
  for (const { p, bench, i } of rows) {
    const altPos = normalizeAltPositions(p).join(",");
    await db.execute({
      sql: `INSERT INTO players (id,team_id,name,pos,rating,alt_pos,is_bench,sort_order) VALUES (?,?,?,?,?,?,?,?)`,
      args: [
        randomUUID(),
        teamId,
        String(p.name).slice(0, 40),
        p.pos,
        clampRating(p.rating),
        altPos,
        bench,
        i,
      ],
    });
  }
}

const clampRating = (n: number) =>
  Math.max(40, Math.min(99, Math.round(Number(n) || 60)));

function normalizeAltPositions(p: Player): Position[] {
  return (p.altPositions ?? []).filter(
    (pos, idx, arr) => pos !== p.pos && arr.indexOf(pos) === idx,
  );
}

function parseAltPositions(v: unknown, main: Position): Position[] | undefined {
  const positions = String(v ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean) as Position[];
  const unique = positions.filter(
    (pos, idx, arr) => pos !== main && arr.indexOf(pos) === idx,
  );
  return unique.length ? unique : undefined;
}

function rowsToTeams(
  teamRows: Record<string, unknown>[],
  playerRows: Record<string, unknown>[],
): DbTeam[] {
  const byTeam = new Map<string, { players: Player[]; bench: Player[] }>();
  for (const p of [...playerRows].sort(
    (a, b) => Number(a.sort_order) - Number(b.sort_order),
  )) {
    const tid = String(p.team_id);
    if (!byTeam.has(tid)) byTeam.set(tid, { players: [], bench: [] });
    const pos = String(p.pos) as Position;
    const pl: Player = {
      name: String(p.name),
      pos,
      altPositions: parseAltPositions(p.alt_pos, pos),
      rating: Number(p.rating),
    };
    (Number(p.is_bench)
      ? byTeam.get(tid)!.bench
      : byTeam.get(tid)!.players
    ).push(pl);
  }
  return teamRows.map((t) => {
    const id = String(t.id);
    const grp = byTeam.get(id) ?? { players: [], bench: [] };
    return {
      id,
      name: String(t.name),
      season: String(t.season ?? ""),
      league: String(t.league ?? ""),
      players: grp.players,
      bench: grp.bench.length ? grp.bench : undefined,
      kind: String(t.kind) as TeamKind,
      ownerId: t.owner_id ? String(t.owner_id) : null,
      alias: String(t.alias ?? "") || String(t.name),
    };
  });
}

/** Official teams (owner_id IS NULL), optionally filtered by kind. Used by the game. */
export async function getOfficialTeams(kind?: TeamKind): Promise<DbTeam[]> {
  const sql = kind
    ? "SELECT * FROM teams WHERE owner_id IS NULL AND kind = ?"
    : "SELECT * FROM teams WHERE owner_id IS NULL";
  const teamRows = (await db.execute({ sql, args: kind ? [kind] : [] }))
    .rows as unknown as Record<string, unknown>[];
  if (!teamRows.length) return [];
  const ids = teamRows.map((t) => String(t.id));
  const ph = ids.map(() => "?").join(",");
  const playerRows = (
    await db.execute({
      sql: `SELECT * FROM players WHERE team_id IN (${ph})`,
      args: ids,
    })
  ).rows as unknown as Record<string, unknown>[];
  return rowsToTeams(teamRows, playerRows);
}

/** Teams visible to a user: official + their own (admins see everything). */
export async function getVisibleTeams(
  userId: string | null,
  role: string,
): Promise<DbTeam[]> {
  let sql = "SELECT * FROM teams WHERE owner_id IS NULL";
  const args: string[] = [];
  if (role === "admin") sql = "SELECT * FROM teams";
  else if (userId) {
    sql = "SELECT * FROM teams WHERE owner_id IS NULL OR owner_id = ?";
    args.push(userId);
  }
  const teamRows = (await db.execute({ sql, args })).rows as unknown as Record<
    string,
    unknown
  >[];
  if (!teamRows.length) return [];
  const ids = teamRows.map((t) => String(t.id));
  const ph = ids.map(() => "?").join(",");
  const playerRows = (
    await db.execute({
      sql: `SELECT * FROM players WHERE team_id IN (${ph})`,
      args: ids,
    })
  ).rows as unknown as Record<string, unknown>[];
  return rowsToTeams(teamRows, playerRows);
}

export async function getTeamById(id: string): Promise<DbTeam | null> {
  const teamRows = (
    await db.execute({ sql: "SELECT * FROM teams WHERE id = ?", args: [id] })
  ).rows as unknown as Record<string, unknown>[];
  if (!teamRows.length) return null;
  const playerRows = (
    await db.execute({
      sql: "SELECT * FROM players WHERE team_id = ?",
      args: [id],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rowsToTeams(teamRows, playerRows)[0];
}

export async function createTeam(
  input: TeamInput,
  kind: TeamKind,
  ownerId: string | null,
): Promise<DbTeam> {
  const id = randomUUID();
  await writeTeam(
    id,
    input,
    kind,
    ownerId,
    Date.now(),
    (input.alias ?? "").trim() || input.name,
  );
  return (await getTeamById(id))!;
}

export async function updateTeam(
  id: string,
  input: TeamInput,
): Promise<DbTeam | null> {
  await db.execute({
    sql: "UPDATE teams SET name=?, season=?, league=?, alias=? WHERE id=?",
    args: [
      input.name,
      input.season ?? "",
      input.league ?? "",
      (input.alias ?? "").trim() || input.name,
      id,
    ],
  });
  await db.execute({ sql: "DELETE FROM players WHERE team_id=?", args: [id] });
  await writePlayers(id, input);
  return getTeamById(id);
}

export async function deleteTeam(id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM players WHERE team_id=?", args: [id] });
  await db.execute({ sql: "DELETE FROM teams WHERE id=?", args: [id] });
}

export async function getAchievementProgress(
  userId: string,
): Promise<AchievementProgress[]> {
  const rows = (
    await db.execute({
      sql: `SELECT a.id, a.title, a.description, a.category, a.points, a.sort_order,
                 ua.unlocked_at
          FROM achievements a
          LEFT JOIN user_achievements ua
            ON ua.achievement_id = a.id AND ua.user_id = ?
          ORDER BY a.sort_order, a.title`,
      args: [userId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    description: String(r.description),
    category: String(r.category),
    points: Number(r.points),
    sortOrder: Number(r.sort_order),
    unlockedAt: r.unlocked_at ? Number(r.unlocked_at) : null,
  }));
}

export async function unlockAchievement(
  userId: string,
  achievementId: string,
): Promise<boolean> {
  const exists = await db.execute({
    sql: "SELECT 1 FROM achievements WHERE id=?",
    args: [achievementId],
  });
  if (!exists.rows.length) return false;
  const before = await db.execute({
    sql: "SELECT 1 FROM user_achievements WHERE user_id=? AND achievement_id=?",
    args: [userId, achievementId],
  });
  if (before.rows.length) return false;
  await db.execute({
    sql: "INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?,?,?)",
    args: [userId, achievementId, Date.now()],
  });
  return true;
}

export async function grantExperience(
  userId: string,
  sourceKey: string,
  amount: number,
  reason: string,
): Promise<{ granted: boolean; progress: UserProgress }> {
  const xp = Math.max(1, Math.min(500, Math.round(Number(amount) || 0)));
  const key = String(sourceKey || "").trim().slice(0, 180);
  if (!key) return { granted: false, progress: await getUserProgress(userId) };
  try {
    await db.execute({
      sql: "INSERT INTO user_xp_events (id,user_id,source_key,amount,reason,created_at) VALUES (?,?,?,?,?,?)",
      args: [
        randomUUID(),
        userId,
        key,
        xp,
        String(reason || "").slice(0, 120),
        Date.now(),
      ],
    });
    return { granted: true, progress: await getUserProgress(userId) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("user_xp_events")) {
      return { granted: false, progress: await getUserProgress(userId) };
    }
    throw err;
  }
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
  const ach = await db.execute({
    sql: `SELECT COALESCE(SUM(a.points), 0) AS xp
          FROM user_achievements ua
          JOIN achievements a ON a.id = ua.achievement_id
          WHERE ua.user_id = ?`,
    args: [userId],
  });
  const act = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) AS xp FROM user_xp_events WHERE user_id = ?",
    args: [userId],
  });
  const achievementXp = Number(ach.rows[0]?.xp ?? 0);
  const activityXp = Number(act.rows[0]?.xp ?? 0);
  return {
    ...buildLevelProgress(achievementXp + activityXp),
    achievementXp,
    activityXp,
  };
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 10)));
  const rows = (
    await db.execute({
      sql: `SELECT u.id, u.username,
                   COALESCE(ax.xp, 0) AS achievement_xp,
                   COALESCE(xx.xp, 0) AS activity_xp
            FROM users u
            LEFT JOIN (
              SELECT ua.user_id, SUM(a.points) AS xp
              FROM user_achievements ua
              JOIN achievements a ON a.id = ua.achievement_id
              GROUP BY ua.user_id
            ) ax ON ax.user_id = u.id
            LEFT JOIN (
              SELECT user_id, SUM(amount) AS xp
              FROM user_xp_events
              GROUP BY user_id
            ) xx ON xx.user_id = u.id
            ORDER BY (COALESCE(ax.xp, 0) + COALESCE(xx.xp, 0)) DESC,
                     u.username ASC
            LIMIT ?`,
      args: [safeLimit],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map((row, index) => {
    const achievementXp = Number(row.achievement_xp ?? 0);
    const activityXp = Number(row.activity_xp ?? 0);
    return {
      userId: String(row.id),
      username: String(row.username),
      rank: index + 1,
      ...buildLevelProgress(achievementXp + activityXp),
      achievementXp,
      activityXp,
    };
  });
}
