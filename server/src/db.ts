import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { RETIRED_HISTORICAL_CLUB_IDS, TEAMS } from "../../shared/data/teams.js";
import {
  WC_DRAFT_TEAMS,
  WC_BOSS,
  WC_OPPONENT_TEAMS,
} from "../../shared/data/worldcup.js";
import { LEAGUE_STRUCTURES } from "../../shared/leagueStructures.js";
import { CLUB_ALIASES } from "../../shared/data/aliases.js";
import { ACHIEVEMENTS, type AchievementDefinition } from "../../shared/achievements.js";
import { buildLevelProgress, type LevelProgress } from "../../shared/progression.js";
import {
  PLAYER_ATTRIBUTE_KEYS,
  withDerivedAttributes,
} from "../../shared/playerAttributes.js";
import type {
  AttackFocus,
  ManagerPlayer,
  ManagerSave,
  ManagerStanding,
  Mentality,
  Team,
  Player,
  Position,
} from "../../shared/types.js";

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

async function backfillPlayerAttributes(): Promise<void> {
  const rows = (
    await db.execute(
      "SELECT id, name, pos, rating, pac, sho, pas, dri, def, phy FROM players",
    )
  ).rows as unknown as Record<string, unknown>[];

  for (const row of rows) {
    const missing = PLAYER_ATTRIBUTE_KEYS.some((key) => row[key] == null);
    if (!missing) continue;
    const player = withDerivedAttributes({
      name: String(row.name),
      pos: String(row.pos) as Position,
      rating: Number(row.rating),
      pac: row.pac == null ? undefined : Number(row.pac),
      sho: row.sho == null ? undefined : Number(row.sho),
      pas: row.pas == null ? undefined : Number(row.pas),
      dri: row.dri == null ? undefined : Number(row.dri),
      def: row.def == null ? undefined : Number(row.def),
      phy: row.phy == null ? undefined : Number(row.phy),
    });
    await db.execute({
      sql: "UPDATE players SET pac=?, sho=?, pas=?, dri=?, def=?, phy=? WHERE id=?",
      args: [
        player.pac ?? null,
        player.sho ?? null,
        player.pas ?? null,
        player.dri ?? null,
        player.def ?? null,
        player.phy ?? null,
        String(row.id),
      ],
    });
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
export type Achievement = AchievementDefinition;
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
  avatarUrl: string | null;
}
export interface PublicUser {
  id: string;
  username: string;
  role: "user" | "admin";
  avatarUrl: string | null;
}
export type FeedbackCategory = "suggestion" | "bug" | "balance" | "other";
export interface FeedbackInput {
  category: FeedbackCategory;
  message: string;
  contact?: string;
  page?: string;
  userAgent?: string;
}
export interface FeedbackEntry extends FeedbackInput {
  id: string;
  userId: string;
  username: string;
  status: "new" | "reviewed" | "archived";
  createdAt: number;
}

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
        role TEXT NOT NULL DEFAULT 'user', avatar_url TEXT NOT NULL DEFAULT '',
        avatar_key TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, season TEXT NOT NULL DEFAULT '',
        league TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'club',
        alias TEXT NOT NULL DEFAULT '', owner_id TEXT, created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY, team_id TEXT NOT NULL, name TEXT NOT NULL, pos TEXT NOT NULL,
        rating INTEGER NOT NULL, alt_pos TEXT NOT NULL DEFAULT '',
        pac INTEGER, sho INTEGER, pas INTEGER, dri INTEGER, def INTEGER, phy INTEGER,
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
      `CREATE TABLE IF NOT EXISTS feedback_messages (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category TEXT NOT NULL,
        message TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '',
        page TEXT NOT NULL DEFAULT '', user_agent TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new', created_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS manager_career_states (
        user_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS manager_saves (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, time_escolhido_id TEXT NOT NULL,
        dinheiro_clube INTEGER NOT NULL DEFAULT 25000000,
        capacidade_estadio INTEGER NOT NULL DEFAULT 15000,
        preco_ingresso INTEGER NOT NULL DEFAULT 35,
        temporada_atual INTEGER NOT NULL DEFAULT 1,
        rodada_atual INTEGER NOT NULL DEFAULT 1,
        pontos INTEGER NOT NULL DEFAULT 0,
        vitorias INTEGER NOT NULL DEFAULT 0,
        empates INTEGER NOT NULL DEFAULT 0,
        derrotas INTEGER NOT NULL DEFAULT 0,
        gols_pro INTEGER NOT NULL DEFAULT 0,
        gols_contra INTEGER NOT NULL DEFAULT 0,
        formation_id TEXT NOT NULL DEFAULT '4-3-3',
        mentality TEXT NOT NULL DEFAULT 'equilibrada',
        attack_focus TEXT NOT NULL DEFAULT 'equilibrado',
        training_center_level INTEGER NOT NULL DEFAULT 1,
        medical_department_level INTEGER NOT NULL DEFAULT 1,
        youth_academy_level INTEGER NOT NULL DEFAULT 1,
        country_origin TEXT NOT NULL DEFAULT 'brasil',
        league_id TEXT NOT NULL DEFAULT 'brasil',
        division_id TEXT NOT NULL DEFAULT 'brasil-serie-a',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS manager_roster_players (
        id TEXT PRIMARY KEY, save_id TEXT NOT NULL, source_player_id TEXT NOT NULL DEFAULT '',
        original_team_id TEXT NOT NULL, team_id TEXT NOT NULL, team_name TEXT NOT NULL,
        name TEXT NOT NULL, pos TEXT NOT NULL, rating INTEGER NOT NULL, alt_pos TEXT NOT NULL DEFAULT '',
        pac INTEGER, sho INTEGER, pas INTEGER, dri INTEGER, def INTEGER, phy INTEGER,
        value INTEGER NOT NULL, is_starter INTEGER NOT NULL DEFAULT 0,
        lineup_slot_id TEXT NOT NULL DEFAULT '', is_listed INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS manager_standings (
        save_id TEXT NOT NULL, team_id TEXT NOT NULL, team_name TEXT NOT NULL,
        played INTEGER NOT NULL DEFAULT 0, points INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0, goals_for INTEGER NOT NULL DEFAULT 0,
        goals_against INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (save_id, team_id))`,
      `CREATE TABLE IF NOT EXISTS league_tables (
        save_id TEXT NOT NULL, division_id TEXT NOT NULL, team_id TEXT NOT NULL,
        team_name TEXT NOT NULL, played INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
        goals_for INTEGER NOT NULL DEFAULT 0, goals_against INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (save_id, division_id, team_id))`,
      `CREATE TABLE IF NOT EXISTS club_staff (
        id TEXT PRIMARY KEY, save_id TEXT NOT NULL, team_id TEXT NOT NULL,
        role TEXT NOT NULL, name TEXT NOT NULL, efficiency_multiplier REAL NOT NULL DEFAULT 1,
        weekly_salary INTEGER NOT NULL DEFAULT 0, hired_at INTEGER NOT NULL,
        UNIQUE(save_id, team_id, role))`,
      `CREATE TABLE IF NOT EXISTS player_career_instances (
        id TEXT PRIMARY KEY, save_id TEXT NOT NULL, source_player_id TEXT NOT NULL DEFAULT '',
        original_team_id TEXT NOT NULL, team_id TEXT NOT NULL, team_name TEXT NOT NULL,
        name TEXT NOT NULL, pos TEXT NOT NULL, rating INTEGER NOT NULL, alt_pos TEXT NOT NULL DEFAULT '',
        pac INTEGER, sho INTEGER, pas INTEGER, dri INTEGER, def INTEGER, phy INTEGER,
        age INTEGER NOT NULL DEFAULT 24, country_origin TEXT NOT NULL DEFAULT '',
        potential_rating INTEGER NOT NULL DEFAULT 75, moral INTEGER NOT NULL DEFAULT 70,
        individual_instructions TEXT NOT NULL DEFAULT '{}',
        value INTEGER NOT NULL, is_starter INTEGER NOT NULL DEFAULT 0,
        lineup_slot_id TEXT NOT NULL DEFAULT '', is_listed INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0)`,
      `CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)`,
      `CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_xp_events_user ON user_xp_events(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_messages(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_messages(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_manager_career_states_updated ON manager_career_states(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_manager_saves_user ON manager_saves(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_manager_roster_save_team ON manager_roster_players(save_id, team_id)`,
      `CREATE INDEX IF NOT EXISTS idx_manager_standings_save ON manager_standings(save_id)`,
      `CREATE INDEX IF NOT EXISTS idx_league_tables_save_division ON league_tables(save_id, division_id)`,
      `CREATE INDEX IF NOT EXISTS idx_club_staff_save_team ON club_staff(save_id, team_id)`,
      `CREATE INDEX IF NOT EXISTS idx_player_career_save_team ON player_career_instances(save_id, team_id)`,
    ],
    "write",
  );
  await migrateDb();
  await backfillPlayerAttributes();
  await seedAchievements();
  await seedIfEmpty();
  await syncOfficialClubCatalog();
}

async function migrateDb(): Promise<void> {
  const addedColumns = [
    "players ADD COLUMN alt_pos TEXT NOT NULL DEFAULT ''",
    "players ADD COLUMN pac INTEGER",
    "players ADD COLUMN sho INTEGER",
    "players ADD COLUMN pas INTEGER",
    "players ADD COLUMN dri INTEGER",
    "players ADD COLUMN def INTEGER",
    "players ADD COLUMN phy INTEGER",
    "users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''",
    "users ADD COLUMN avatar_key TEXT NOT NULL DEFAULT ''",
    "manager_saves ADD COLUMN rodada_atual INTEGER NOT NULL DEFAULT 1",
    "manager_saves ADD COLUMN gols_pro INTEGER NOT NULL DEFAULT 0",
    "manager_saves ADD COLUMN gols_contra INTEGER NOT NULL DEFAULT 0",
    "manager_saves ADD COLUMN formation_id TEXT NOT NULL DEFAULT '4-3-3'",
    "manager_saves ADD COLUMN mentality TEXT NOT NULL DEFAULT 'equilibrada'",
    "manager_saves ADD COLUMN attack_focus TEXT NOT NULL DEFAULT 'equilibrado'",
    "manager_saves ADD COLUMN training_center_level INTEGER NOT NULL DEFAULT 1",
    "manager_saves ADD COLUMN medical_department_level INTEGER NOT NULL DEFAULT 1",
    "manager_saves ADD COLUMN youth_academy_level INTEGER NOT NULL DEFAULT 1",
    "manager_saves ADD COLUMN country_origin TEXT NOT NULL DEFAULT 'brasil'",
    "manager_saves ADD COLUMN league_id TEXT NOT NULL DEFAULT 'brasil'",
    "manager_saves ADD COLUMN division_id TEXT NOT NULL DEFAULT 'brasil-serie-a'",
  ];
  for (const column of addedColumns) {
    try {
      await db.execute(`ALTER TABLE ${column}`);
    } catch (err) {
      const msg = (
        err instanceof Error ? err.message : String(err)
      ).toLowerCase();
      if (!msg.includes("duplicate column")) throw err;
    }
  }
}

function publicUserFromRow(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    username: String(row.username),
    role: String(row.role) === "admin" ? "admin" : "user",
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  };
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const rows = (
    await db.execute({
      sql: "SELECT id, username, role, avatar_url FROM users WHERE id = ? LIMIT 1",
      args: [userId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows[0] ? publicUserFromRow(rows[0]) : null;
}

export async function getManagerCareerState(userId: string): Promise<string | null> {
  const rows = (
    await db.execute({
      sql: "SELECT state_json FROM manager_career_states WHERE user_id = ? LIMIT 1",
      args: [userId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows[0] ? String(rows[0].state_json) : null;
}

export async function saveManagerCareerState(userId: string, stateJson: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO manager_career_states (user_id, state_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            state_json = excluded.state_json,
            updated_at = excluded.updated_at`,
    args: [userId, stateJson, Date.now()],
  });
}

export async function deleteManagerCareer(userId: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM manager_career_states WHERE user_id = ?", args: [userId] });
  await db.execute({ sql: "DELETE FROM manager_roster_players WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM manager_standings WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM league_tables WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM club_staff WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM player_career_instances WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM manager_saves WHERE user_id = ?", args: [userId] });
}

export async function getUserPasswordHash(userId: string): Promise<string | null> {
  const rows = (
    await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      args: [userId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows[0] ? String(rows[0].password_hash) : null;
}

export async function updatePublicUserProfile(
  userId: string,
  username: string,
): Promise<PublicUser | { error: string }> {
  try {
    await db.execute({
      sql: "UPDATE users SET username = ? WHERE id = ?",
      args: [username, userId],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("users.username")) {
      return { error: "Esse usuário já existe." };
    }
    throw err;
  }
  return (await getPublicUser(userId))!;
}

export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [passwordHash, userId],
  });
}

export async function updateUserAvatar(
  userId: string,
  avatarUrl: string,
  avatarKey: string,
): Promise<PublicUser | null> {
  await db.execute({
    sql: "UPDATE users SET avatar_url = ?, avatar_key = ? WHERE id = ?",
    args: [avatarUrl, avatarKey, userId],
  });
  return getPublicUser(userId);
}

async function seedAchievements(): Promise<void> {
  for (const a of ACHIEVEMENTS) {
    await db.execute({
      sql: `INSERT INTO achievements (id,title,description,category,points,sort_order)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title,
              description = excluded.description,
              category = excluded.category,
              points = excluded.points,
              sort_order = excluded.sort_order`,
      args: [a.id, a.title, a.description, a.category, a.points, a.sortOrder],
    });
  }
}

async function seedIfEmpty(): Promise<void> {
  const now = Date.now();
  let clubCount = 0;
  let nationalCount = 0;
  for (const t of TEAMS) {
    const alias = CLUB_ALIASES[t.id];
    if (!alias) throw new Error(`Missing public alias for official club: ${t.id}`);
    const exists = await db.execute({
      sql: "SELECT 1 FROM teams WHERE id=? LIMIT 1",
      args: [t.id],
    });
    if (exists.rows.length) continue;
    await writeTeam(t.id, t, "club", null, now, alias);
    clubCount++;
  }
  const nationalTeams = [...new Map(
    [...WC_DRAFT_TEAMS, ...WC_OPPONENT_TEAMS, WC_BOSS].map((team) => [team.id, team]),
  ).values()];
  for (const t of nationalTeams) {
    const exists = await db.execute({
      sql: "SELECT 1 FROM teams WHERE id=? LIMIT 1",
      args: [t.id],
    });
    if (exists.rows.length) continue;
    await writeTeam(t.id, t, "national", null, now, t.name);
    nationalCount++;
  }
  console.log(
    `[db] seeded ${clubCount} clubs + ${nationalCount} national teams`,
  );
}

async function syncOfficialClubCatalog(): Promise<void> {
  for (const id of RETIRED_HISTORICAL_CLUB_IDS) {
    await db.execute({
      sql: `DELETE FROM players
            WHERE team_id IN (
              SELECT id FROM teams WHERE id = ? AND owner_id IS NULL AND kind = 'club'
            )`,
      args: [id],
    });
    await db.execute({
      sql: "DELETE FROM teams WHERE id = ? AND owner_id IS NULL AND kind = 'club'",
      args: [id],
    });
  }

  for (const team of TEAMS) {
    const alias = CLUB_ALIASES[team.id];
    if (!alias) throw new Error(`Missing public alias for official club: ${team.id}`);
    await db.execute({
      sql: `UPDATE teams SET alias = ?
            WHERE id = ? AND owner_id IS NULL AND kind = 'club'`,
      args: [alias, team.id],
    });
  }
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
    const player = withDerivedAttributes(p);
    const altPos = normalizeAltPositions(p).join(",");
    await db.execute({
      sql: `INSERT INTO players (id,team_id,name,pos,rating,alt_pos,pac,sho,pas,dri,def,phy,is_bench,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        randomUUID(),
        teamId,
        String(player.name).slice(0, 40),
        player.pos,
        clampRating(player.rating),
        altPos,
        clampAttribute(player.pac),
        clampAttribute(player.sho),
        clampAttribute(player.pas),
        clampAttribute(player.dri),
        clampAttribute(player.def),
        clampAttribute(player.phy),
        bench,
        i,
      ],
    });
  }
}

const clampRating = (n: number) =>
  Math.max(40, Math.min(99, Math.round(Number(n) || 60)));

const clampAttribute = (n: unknown): number | null => {
  if (n == null || n === "") return null;
  const value = Number(n);
  if (!Number.isFinite(value)) return null;
  return Math.max(1, Math.min(99, Math.round(value)));
};

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
      pac: p.pac == null ? undefined : Number(p.pac),
      sho: p.sho == null ? undefined : Number(p.sho),
      pas: p.pas == null ? undefined : Number(p.pas),
      dri: p.dri == null ? undefined : Number(p.dri),
      def: p.def == null ? undefined : Number(p.def),
      phy: p.phy == null ? undefined : Number(p.phy),
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

/** Case-insensitive duplicate check scoped to the same owner (official or user). */
export async function findTeamByNameSeason(
  name: string,
  season: string,
  ownerId: string | null,
): Promise<{ id: string; name: string; season: string } | null> {
  const sql = ownerId
    ? "SELECT id, name, season FROM teams WHERE LOWER(TRIM(name)) = ? AND TRIM(COALESCE(season,'')) = ? AND owner_id = ? LIMIT 1"
    : "SELECT id, name, season FROM teams WHERE LOWER(TRIM(name)) = ? AND TRIM(COALESCE(season,'')) = ? AND owner_id IS NULL LIMIT 1";
  const args = ownerId
    ? [name.trim().toLowerCase(), (season ?? "").trim(), ownerId]
    : [name.trim().toLowerCase(), (season ?? "").trim()];
  const rows = (await db.execute({ sql, args })).rows as unknown as Record<
    string,
    unknown
  >[];
  if (!rows.length) return null;
  return {
    id: String(rows[0].id),
    name: String(rows[0].name),
    season: String(rows[0].season ?? ""),
  };
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

export async function getLeaderboard(limit: number | null = 10): Promise<LeaderboardEntry[]> {
  const safeLimit = limit === null
    ? null
    : Math.max(1, Math.min(50, Math.round(Number(limit) || 10)));
  const rows = (
    await db.execute({
      sql: `SELECT u.id, u.username, u.avatar_url,
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
            ${safeLimit === null ? "" : "LIMIT ?"}`,
      args: safeLimit === null ? [] : [safeLimit],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map((row, index) => {
    const achievementXp = Number(row.achievement_xp ?? 0);
    const activityXp = Number(row.activity_xp ?? 0);
    return {
      userId: String(row.id),
      username: String(row.username),
      rank: index + 1,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      ...buildLevelProgress(achievementXp + activityXp),
      achievementXp,
      activityXp,
    };
  });
}

const FEEDBACK_CATEGORIES = new Set<FeedbackCategory>([
  "suggestion",
  "bug",
  "balance",
  "other",
]);

export function normalizeFeedbackInput(input: FeedbackInput): FeedbackInput {
  const category = FEEDBACK_CATEGORIES.has(input.category)
    ? input.category
    : "other";
  return {
    category,
    message: String(input.message ?? "").trim().slice(0, 2400),
    contact: String(input.contact ?? "").trim().slice(0, 180),
    page: String(input.page ?? "").trim().slice(0, 240),
    userAgent: String(input.userAgent ?? "").trim().slice(0, 360),
  };
}

export async function createFeedback(
  userId: string,
  input: FeedbackInput,
): Promise<{ id: string; createdAt: number }> {
  const feedback = normalizeFeedbackInput(input);
  const id = randomUUID();
  const createdAt = Date.now();
  await db.execute({
    sql: `INSERT INTO feedback_messages
          (id,user_id,category,message,contact,page,user_agent,status,created_at)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [
      id,
      userId,
      feedback.category,
      feedback.message,
      feedback.contact ?? "",
      feedback.page ?? "",
      feedback.userAgent ?? "",
      "new",
      createdAt,
    ],
  });
  return { id, createdAt };
}

export async function getFeedbackCountForUser(userId: string): Promise<number> {
  const result = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM feedback_messages WHERE user_id = ?",
    args: [userId],
  });
  return Number(result.rows[0]?.total ?? 0);
}

export async function getFeedback(limit = 50): Promise<FeedbackEntry[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 50)));
  const rows = (
    await db.execute({
      sql: `SELECT f.id, f.user_id, u.username, f.category, f.message, f.contact,
                   f.page, f.user_agent, f.status, f.created_at
            FROM feedback_messages f
            JOIN users u ON u.id = f.user_id
            ORDER BY f.created_at DESC
            LIMIT ?`,
      args: [safeLimit],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    username: String(row.username),
    category: String(row.category) as FeedbackCategory,
    message: String(row.message),
    contact: String(row.contact ?? ""),
    page: String(row.page ?? ""),
    userAgent: String(row.user_agent ?? ""),
    status: String(row.status ?? "new") as FeedbackEntry["status"],
    createdAt: Number(row.created_at),
  }));
}

const MANAGER_INITIAL_MONEY = 25_000_000;
const MANAGER_INITIAL_STADIUM = 15_000;
const MANAGER_INITIAL_TICKET = 35;
const DEFAULT_MANAGER_COUNTRY = "brasil";
const DEFAULT_MANAGER_LEAGUE = "brasil";
const DEFAULT_MANAGER_DIVISION = "brasil-serie-a";

function countryForTeam(teamId: string): string {
  for (const league of LEAGUE_STRUCTURES) {
    for (const division of league.divisions) {
      if (division.teams.some((team) => team.playableTeamId === teamId || team.id === teamId)) {
        return league.country;
      }
    }
  }
  return DEFAULT_MANAGER_COUNTRY;
}

function leagueForTeam(teamId: string): { leagueId: string; divisionId: string } {
  for (const league of LEAGUE_STRUCTURES) {
    for (const division of league.divisions) {
      if (division.teams.some((team) => team.playableTeamId === teamId || team.id === teamId)) {
        return { leagueId: league.id, divisionId: division.id };
      }
    }
  }
  return { leagueId: DEFAULT_MANAGER_LEAGUE, divisionId: DEFAULT_MANAGER_DIVISION };
}

function inferredPlayerAge(rating: number, index: number): number {
  const base = rating >= 86 ? 27 : rating >= 80 ? 25 : 23;
  return Math.max(17, Math.min(38, base + (index % 7) - 3));
}

function inferredPotential(rating: number, age: number): number {
  const growth = age <= 21 ? 8 : age <= 24 ? 5 : age <= 27 ? 2 : 0;
  return Math.max(rating, Math.min(99, rating + growth));
}

function safeInstructions(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value || "{}")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function managerPlayerValue(rating: number): number {
  const r = Math.max(40, Math.min(99, Math.round(rating)));
  return Math.round(((r - 45) ** 2 * 12500 + 150000) / 1000) * 1000;
}

function managerSaveFromRow(row: Record<string, unknown>, teamName: string): ManagerSave {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    teamId: String(row.time_escolhido_id),
    teamName,
    money: Number(row.dinheiro_clube),
    stadiumCapacity: Number(row.capacidade_estadio),
    ticketPrice: Number(row.preco_ingresso),
    season: Number(row.temporada_atual),
    round: Number(row.rodada_atual ?? 1),
    points: Number(row.pontos),
    wins: Number(row.vitorias),
    draws: Number(row.empates),
    losses: Number(row.derrotas),
    goalsFor: Number(row.gols_pro ?? 0),
    goalsAgainst: Number(row.gols_contra ?? 0),
    prestige: Number(row.prestige ?? 58),
    boardConfidence: Number(row.board_confidence ?? 65),
    supporterMembers: Number(row.supporter_members ?? 12000),
    fanbase: Number(row.fanbase ?? 180000),
    sponsorName: String(row.sponsor_name ?? "Pebol Bank"),
    sponsorWeeklyIncome: Number(row.sponsor_weekly_income ?? 450000),
    sponsorTier: Number(row.sponsor_tier ?? 2),
    formationId: String(row.formation_id ?? "4-3-3"),
    mentality: String(row.mentality ?? "equilibrada") as Mentality,
    attackFocus: String(row.attack_focus ?? "equilibrado") as AttackFocus,
    trainingCenterLevel: Number(row.training_center_level ?? 1),
    medicalDepartmentLevel: Number(row.medical_department_level ?? 1),
    youthAcademyLevel: Number(row.youth_academy_level ?? 1),
    countryOrigin: String(row.country_origin ?? DEFAULT_MANAGER_COUNTRY),
    leagueId: String(row.league_id ?? DEFAULT_MANAGER_LEAGUE),
    divisionId: String(row.division_id ?? DEFAULT_MANAGER_DIVISION),
  };
}

function managerPlayerFromRow(row: Record<string, unknown>): ManagerPlayer {
  const pos = String(row.pos) as Position;
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    originalTeamId: String(row.original_team_id),
    teamName: String(row.team_name),
    age: Number(row.age ?? 24),
    countryOrigin: String(row.country_origin ?? ""),
    potentialRating: Number(row.potential_rating ?? row.rating ?? 75),
    morale: Number(row.moral ?? 70),
    fitness: 92,
    sharpness: 62,
    developmentProgress: 0,
    injuryRounds: 0,
    suspensionMatches: 0,
    individualInstructions: safeInstructions(row.individual_instructions),
    name: String(row.name),
    pos,
    altPositions: parseAltPositions(row.alt_pos, pos),
    rating: Number(row.rating),
    pac: row.pac == null ? undefined : Number(row.pac),
    sho: row.sho == null ? undefined : Number(row.sho),
    pas: row.pas == null ? undefined : Number(row.pas),
    dri: row.dri == null ? undefined : Number(row.dri),
    def: row.def == null ? undefined : Number(row.def),
    phy: row.phy == null ? undefined : Number(row.phy),
    value: Number(row.value),
    isStarter: Number(row.is_starter) === 1,
    lineupSlotId: row.lineup_slot_id ? String(row.lineup_slot_id) : null,
    isListed: Number(row.is_listed) === 1,
  };
}

export async function listManagerStartTeams(): Promise<Array<{ id: string; name: string; season: string; league: string }>> {
  const rows = (
    await db.execute({
      sql: "SELECT id, alias, name, season, league FROM teams WHERE owner_id IS NULL AND kind = 'club' ORDER BY league, alias, name",
      args: [],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.alias || row.name),
    season: String(row.season ?? ""),
    league: String(row.league ?? ""),
  }));
}

export async function getManagerSave(userId: string): Promise<ManagerSave | null> {
  const rows = (
    await db.execute({
      sql: `SELECT ms.*, COALESCE(t.alias, t.name, ms.time_escolhido_id) AS team_name
            FROM manager_saves ms
            LEFT JOIN teams t ON t.id = ms.time_escolhido_id
            WHERE ms.user_id = ?
            ORDER BY ms.updated_at DESC
            LIMIT 1`,
      args: [userId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows[0] ? managerSaveFromRow(rows[0], String(rows[0].team_name)) : null;
}

export async function getManagerSaveById(saveId: string): Promise<ManagerSave | null> {
  const rows = (
    await db.execute({
      sql: `SELECT ms.*, COALESCE(t.alias, t.name, ms.time_escolhido_id) AS team_name
            FROM manager_saves ms
            LEFT JOIN teams t ON t.id = ms.time_escolhido_id
            WHERE ms.id = ?
            LIMIT 1`,
      args: [saveId],
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows[0] ? managerSaveFromRow(rows[0], String(rows[0].team_name)) : null;
}

export async function createManagerSave(userId: string, teamId: string): Promise<ManagerSave | { error: string }> {
  const team = await getTeamById(teamId);
  if (!team || team.kind !== "club" || team.ownerId) {
    return { error: "Escolha um clube oficial para iniciar a carreira." };
  }
  const clubs = await getOfficialTeams("club");
  if (clubs.length < 4) return { error: "Não há clubes suficientes para montar a liga." };

  const id = randomUUID();
  const now = Date.now();
  const countryOrigin = countryForTeam(teamId);
  const leagueMeta = leagueForTeam(teamId);
  await db.execute({ sql: "DELETE FROM manager_roster_players WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM manager_standings WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM league_tables WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM club_staff WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM player_career_instances WHERE save_id IN (SELECT id FROM manager_saves WHERE user_id = ?)", args: [userId] });
  await db.execute({ sql: "DELETE FROM manager_saves WHERE user_id = ?", args: [userId] });
  await db.execute({
    sql: `INSERT INTO manager_saves
          (id,user_id,time_escolhido_id,dinheiro_clube,capacidade_estadio,preco_ingresso,
           temporada_atual,rodada_atual,pontos,vitorias,empates,derrotas,gols_pro,gols_contra,
           formation_id,mentality,attack_focus,training_center_level,medical_department_level,
           youth_academy_level,country_origin,league_id,division_id,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      id,
      userId,
      teamId,
      MANAGER_INITIAL_MONEY,
      MANAGER_INITIAL_STADIUM,
      MANAGER_INITIAL_TICKET,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      "4-3-3",
      "equilibrada",
      "equilibrado",
      1,
      1,
      1,
      countryOrigin,
      leagueMeta.leagueId,
      leagueMeta.divisionId,
      now,
      now,
    ],
  });

  for (const club of clubs) {
    await db.execute({
      sql: `INSERT INTO manager_standings
            (save_id,team_id,team_name,played,points,wins,draws,losses,goals_for,goals_against)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [id, club.id, club.alias || club.name, 0, 0, 0, 0, 0, 0, 0],
    });
    await db.execute({
      sql: `INSERT INTO league_tables
            (save_id,division_id,team_id,team_name,played,points,wins,draws,losses,goals_for,goals_against)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id,
        leagueForTeam(club.id).divisionId,
        club.id,
        club.alias || club.name,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ],
    });
    const players = [...club.players, ...(club.bench ?? [])];
    for (const [index, playerInput] of players.entries()) {
      const player = withDerivedAttributes(playerInput);
      const isUserTeam = club.id === teamId;
      const starterSlot = isUserTeam && index < 11 ? ["GK", "LB", "CB1", "CB2", "RB", "CM1", "CM2", "CM3", "LW", "ST", "RW"][index] : "";
      const age = inferredPlayerAge(player.rating, index);
      const potential = inferredPotential(player.rating, age);
      await db.execute({
        sql: `INSERT INTO player_career_instances
              (id,save_id,source_player_id,original_team_id,team_id,team_name,name,pos,rating,alt_pos,
               pac,sho,pas,dri,def,phy,age,country_origin,potential_rating,moral,
               individual_instructions,value,is_starter,lineup_slot_id,is_listed,sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          randomUUID(),
          id,
          "",
          club.id,
          club.id,
          club.alias || club.name,
          player.name,
          player.pos,
          player.rating,
          normalizeAltPositions(player).join(","),
          clampAttribute(player.pac),
          clampAttribute(player.sho),
          clampAttribute(player.pas),
          clampAttribute(player.dri),
          clampAttribute(player.def),
          clampAttribute(player.phy),
          age,
          countryForTeam(club.id),
          potential,
          70,
          "{}",
          managerPlayerValue(player.rating),
          starterSlot ? 1 : 0,
          starterSlot,
          index >= 11 || player.rating < 76 ? 1 : 0,
          index,
        ],
      });
    }
  }

  for (const staff of [
    ["youth_coach", "Treinador de Base", 1.02, 18_000],
    ["physio", "Fisioterapeuta", 1.02, 16_000],
    ["scout", "Olheiro", 1.02, 14_000],
    ["assistant", "Auxiliar Técnico", 1.02, 20_000],
  ] as const) {
    await db.execute({
      sql: `INSERT INTO club_staff
            (id,save_id,team_id,role,name,efficiency_multiplier,weekly_salary,hired_at)
            VALUES (?,?,?,?,?,?,?,?)`,
      args: [randomUUID(), id, teamId, staff[0], staff[1], staff[2], staff[3], now],
    });
  }

  return (await getManagerSaveById(id))!;
}

export async function getManagerSquad(saveId: string, teamId?: string): Promise<ManagerPlayer[]> {
  let rows = (
    await db.execute({
      sql: `SELECT * FROM player_career_instances
            WHERE save_id = ? ${teamId ? "AND team_id = ?" : ""}
            ORDER BY is_starter DESC, rating DESC, sort_order ASC, name ASC`,
      args: teamId ? [saveId, teamId] : [saveId],
    })
  ).rows as unknown as Record<string, unknown>[];
  if (!rows.length) {
    rows = (
      await db.execute({
        sql: `SELECT * FROM manager_roster_players
              WHERE save_id = ? ${teamId ? "AND team_id = ?" : ""}
              ORDER BY is_starter DESC, rating DESC, sort_order ASC, name ASC`,
        args: teamId ? [saveId, teamId] : [saveId],
      })
    ).rows as unknown as Record<string, unknown>[];
  }
  return rows.map(managerPlayerFromRow);
}

export async function getManagerStandings(saveId: string): Promise<ManagerStanding[]> {
  let rows = (
    await db.execute({
      sql: `SELECT * FROM league_tables
            WHERE save_id = ?
              AND division_id = (SELECT division_id FROM manager_saves WHERE id = ? LIMIT 1)
            ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC, team_name ASC`,
      args: [saveId, saveId],
    })
  ).rows as unknown as Record<string, unknown>[];
  if (!rows.length) {
    rows = (
      await db.execute({
        sql: `SELECT * FROM manager_standings WHERE save_id = ?
              ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC, team_name ASC`,
        args: [saveId],
      })
    ).rows as unknown as Record<string, unknown>[];
  }
  return rows.map((row) => ({
    teamId: String(row.team_id),
    teamName: String(row.team_name),
    played: Number(row.played),
    points: Number(row.points),
    wins: Number(row.wins),
    draws: Number(row.draws),
    losses: Number(row.losses),
    goalsFor: Number(row.goals_for),
    goalsAgainst: Number(row.goals_against),
    goalDifference: Number(row.goals_for) - Number(row.goals_against),
  }));
}

export async function searchManagerMarket(
  save: ManagerSave,
  filters: { pos?: string; minRating?: number; maxRating?: number },
): Promise<ManagerPlayer[]> {
  const args: Array<string | number> = [save.id, save.teamId];
  let where = "save_id = ? AND team_id <> ? AND is_listed = 1";
  if (filters.pos) {
    where += " AND pos = ?";
    args.push(filters.pos);
  }
  if (filters.minRating) {
    where += " AND rating >= ?";
    args.push(filters.minRating);
  }
  if (filters.maxRating) {
    where += " AND rating <= ?";
    args.push(filters.maxRating);
  }
  const rows = (
    await db.execute({
      sql: `SELECT * FROM player_career_instances WHERE ${where}
            ORDER BY rating DESC, value ASC, name ASC LIMIT 80`,
      args,
    })
  ).rows as unknown as Record<string, unknown>[];
  return rows.map(managerPlayerFromRow);
}

export async function buyManagerPlayer(userId: string, playerId: string): Promise<ManagerSave | { error: string }> {
  const save = await getManagerSave(userId);
  if (!save) return { error: "Crie uma carreira antes de comprar jogadores." };
  const rows = (
    await db.execute({
      sql: "SELECT * FROM player_career_instances WHERE save_id = ? AND id = ? LIMIT 1",
      args: [save.id, playerId],
    })
  ).rows as unknown as Record<string, unknown>[];
  const player = rows[0] ? managerPlayerFromRow(rows[0]) : null;
  if (!player) return { error: "Jogador não encontrado no mercado." };
  if (player.teamId === save.teamId) return { error: "Esse jogador já é do seu clube." };
  if (!player.isListed) return { error: "Esse jogador não está à venda." };
  const price = Math.round(player.value * 1.08);
  if (save.money < price) return { error: "Saldo insuficiente para fechar a compra." };
  await db.execute({
    sql: "UPDATE player_career_instances SET team_id = ?, team_name = ?, is_starter = 0, lineup_slot_id = '', is_listed = 0 WHERE id = ?",
    args: [save.teamId, save.teamName, player.id],
  });
  await db.execute({
    sql: "UPDATE manager_saves SET dinheiro_clube = dinheiro_clube - ?, updated_at = ? WHERE id = ?",
    args: [price, Date.now(), save.id],
  });
  return (await getManagerSaveById(save.id))!;
}

export async function sellManagerPlayer(userId: string, playerId: string): Promise<ManagerSave | { error: string }> {
  const save = await getManagerSave(userId);
  if (!save) return { error: "Crie uma carreira antes de vender jogadores." };
  const squad = await getManagerSquad(save.id, save.teamId);
  const player = squad.find((p) => p.id === playerId);
  if (!player) return { error: "Jogador não pertence ao seu clube." };
  if (squad.length <= 14) return { error: "Você precisa manter pelo menos 14 jogadores no elenco." };
  const destination = player.originalTeamId === save.teamId
    ? (await getManagerStandings(save.id)).find((s) => s.teamId !== save.teamId)?.teamId
    : player.originalTeamId;
  if (!destination) return { error: "Não foi possível encontrar um clube comprador." };
  const destinationName = (await getManagerStandings(save.id)).find((s) => s.teamId === destination)?.teamName ?? "Mercado";
  const price = Math.round(player.value * 0.72);
  await db.execute({
    sql: "UPDATE player_career_instances SET team_id = ?, team_name = ?, is_starter = 0, lineup_slot_id = '', is_listed = 1 WHERE id = ?",
    args: [destination, destinationName, player.id],
  });
  await db.execute({
    sql: "UPDATE manager_saves SET dinheiro_clube = dinheiro_clube + ?, updated_at = ? WHERE id = ?",
    args: [price, Date.now(), save.id],
  });
  return (await getManagerSaveById(save.id))!;
}

export async function upgradeManagerStadium(userId: string): Promise<ManagerSave | { error: string }> {
  const save = await getManagerSave(userId);
  if (!save) return { error: "Crie uma carreira antes de ampliar o estádio." };
  const seats = 2500;
  const cost = Math.round(seats * (780 + save.stadiumCapacity / 90));
  if (save.money < cost) return { error: "Saldo insuficiente para ampliar o estádio." };
  await db.execute({
    sql: "UPDATE manager_saves SET dinheiro_clube = dinheiro_clube - ?, capacidade_estadio = capacidade_estadio + ?, updated_at = ? WHERE id = ?",
    args: [cost, seats, Date.now(), save.id],
  });
  return (await getManagerSaveById(save.id))!;
}

export async function updateManagerLineup(
  userId: string,
  data: {
    formationId: string;
    mentality: Mentality;
    attackFocus: AttackFocus;
    starters: Array<{ playerId: string; slotId: string }>;
  },
): Promise<ManagerSave | { error: string }> {
  const save = await getManagerSave(userId);
  if (!save) return { error: "Crie uma carreira antes de salvar escalação." };
  if (data.starters.length !== 11) return { error: "Escolha exatamente 11 titulares." };
  const ids = new Set(data.starters.map((s) => s.playerId));
  if (ids.size !== 11) return { error: "A escalação tem jogadores repetidos." };
  const squad = await getManagerSquad(save.id, save.teamId);
  if (![...ids].every((id) => squad.some((p) => p.id === id))) {
    return { error: "A escalação contém jogador fora do seu elenco." };
  }
  await db.execute({
    sql: "UPDATE player_career_instances SET is_starter = 0, lineup_slot_id = '' WHERE save_id = ? AND team_id = ?",
    args: [save.id, save.teamId],
  });
  for (const starter of data.starters) {
    await db.execute({
      sql: "UPDATE player_career_instances SET is_starter = 1, lineup_slot_id = ? WHERE save_id = ? AND id = ?",
      args: [starter.slotId, save.id, starter.playerId],
    });
  }
  await db.execute({
    sql: "UPDATE manager_saves SET formation_id = ?, mentality = ?, attack_focus = ?, updated_at = ? WHERE id = ?",
    args: [data.formationId, data.mentality, data.attackFocus, Date.now(), save.id],
  });
  return (await getManagerSaveById(save.id))!;
}

export async function applyManagerMatchResult(
  save: ManagerSave,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
): Promise<void> {
  const apply = async (teamId: string, gf: number, ga: number) => {
    const win = gf > ga ? 1 : 0;
    const draw = gf === ga ? 1 : 0;
    const loss = gf < ga ? 1 : 0;
    await db.execute({
      sql: `UPDATE league_tables
            SET played = played + 1, points = points + ?, wins = wins + ?,
                draws = draws + ?, losses = losses + ?, goals_for = goals_for + ?,
                goals_against = goals_against + ?
            WHERE save_id = ? AND team_id = ?`,
      args: [win ? 3 : draw ? 1 : 0, win, draw, loss, gf, ga, save.id, teamId],
    });
  };
  await apply(homeTeamId, homeGoals, awayGoals);
  await apply(awayTeamId, awayGoals, homeGoals);
  if (homeTeamId === save.teamId || awayTeamId === save.teamId) {
    const gf = homeTeamId === save.teamId ? homeGoals : awayGoals;
    const ga = homeTeamId === save.teamId ? awayGoals : homeGoals;
    const win = gf > ga ? 1 : 0;
    const draw = gf === ga ? 1 : 0;
    const loss = gf < ga ? 1 : 0;
    const income = Math.round(save.stadiumCapacity * save.ticketPrice * (win ? 0.92 : draw ? 0.82 : 0.74));
    await db.execute({
      sql: `UPDATE manager_saves
            SET pontos = pontos + ?, vitorias = vitorias + ?, empates = empates + ?,
                derrotas = derrotas + ?, gols_pro = gols_pro + ?, gols_contra = gols_contra + ?,
                dinheiro_clube = dinheiro_clube + ?, updated_at = ?
            WHERE id = ?`,
      args: [win ? 3 : draw ? 1 : 0, win, draw, loss, gf, ga, income, Date.now(), save.id],
    });
  }
}

export async function advanceManagerRound(saveId: string, nextRound: number): Promise<ManagerSave | null> {
  await db.execute({
    sql: "UPDATE manager_saves SET rodada_atual = ?, updated_at = ? WHERE id = ?",
    args: [nextRound, Date.now(), saveId],
  });
  return getManagerSaveById(saveId);
}
