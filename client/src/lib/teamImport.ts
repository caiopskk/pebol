import type { Player } from "../../../shared/types.js";
import { playerPositions } from "../../../shared/engine.js";
import { posLabel } from "../../../shared/formations.js";
import type { AdminTeam } from "../api.js";

export const ALL_POS = [
  "GK",
  "RB",
  "LB",
  "CB",
  "RWB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
] as const satisfies readonly Player["pos"][];

export type TeamImport = Partial<AdminTeam> & { official?: boolean };

export function playerPosText(p: Player): string {
  return playerPositions(p).map(posLabel).join("/");
}

export function teamFullName(team: { name: string; season?: string }): string {
  if (!team.season || team.name.includes(team.season)) return team.name;
  return `${team.name} ${team.season}`;
}

export function parseAltPositionsInput(
  value: string,
  main: Player["pos"],
): Player["pos"][] | undefined {
  const alt = value
    .split(/[,\s/]+/)
    .map((pos) => pos.trim().toUpperCase())
    .filter(Boolean)
    .filter((pos): pos is Player["pos"] =>
      (ALL_POS as readonly string[]).includes(pos),
    )
    .filter((pos, idx, arr) => pos !== main && arr.indexOf(pos) === idx);
  return alt.length ? alt : undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeImportedPlayer(v: unknown, teamName: string): Player {
  if (!isRecord(v)) throw new Error(`Jogador inválido em ${teamName}.`);
  const name = String(v.name ?? "").trim();
  const pos = String(v.pos ?? "").toUpperCase();
  const rawAlt = Array.isArray(v.altPositions)
    ? v.altPositions
    : Array.isArray(v.positions)
      ? v.positions.filter((p) => String(p).toUpperCase() !== pos)
      : typeof v.altPositions === "string"
        ? v.altPositions.split(/[,\s/]+/)
        : [];
  const rating = Math.round(Number(v.rating));
  const attr = (key: "pac" | "sho" | "pas" | "dri" | "def" | "phy") => {
    const raw = v[key] ?? v[key.toUpperCase()];
    if (raw == null || raw === "") return undefined;
    const value = Math.round(Number(raw));
    if (!Number.isFinite(value) || value < 1 || value > 99)
      throw new Error(
        `${key.toUpperCase()} inválido em ${teamName}: ${name || "jogador sem nome"}.`,
      );
    return value;
  };
  if (!name) throw new Error(`Há jogador sem nome em ${teamName}.`);
  if (!(ALL_POS as readonly string[]).includes(pos))
    throw new Error(`Posição inválida em ${teamName}: ${pos}.`);
  if (!Number.isFinite(rating) || rating < 40 || rating > 99)
    throw new Error(`Rating inválido em ${teamName}: ${name}.`);
  const altPositions = rawAlt
    .map((p) => String(p).trim().toUpperCase())
    .filter((p): p is Player["pos"] =>
      (ALL_POS as readonly string[]).includes(p),
    )
    .filter((p, idx, arr) => p !== pos && arr.indexOf(p) === idx);
  return {
    name,
    pos: pos as Player["pos"],
    altPositions: altPositions.length ? altPositions : undefined,
    rating,
    pac: attr("pac"),
    sho: attr("sho"),
    pas: attr("pas"),
    dri: attr("dri"),
    def: attr("def"),
    phy: attr("phy"),
  };
}

function normalizeImportedTeam(v: unknown, isAdmin: boolean): TeamImport {
  if (!isRecord(v))
    throw new Error("Cada item importado precisa ser um objeto de time.");
  const name = String(v.name ?? "").trim();
  if (!name) throw new Error("Todo time importado precisa de name.");
  const playersRaw = Array.isArray(v.players) ? v.players : [];
  if (playersRaw.length !== 11)
    throw new Error(`${name} precisa ter exatamente 11 titulares em players.`);
  const benchRaw = Array.isArray(v.bench) ? v.bench : [];
  return {
    name,
    season: String(v.season ?? "").trim(),
    league: String(v.league ?? "").trim(),
    alias: String(v.alias ?? "").trim(),
    kind: v.kind === "national" ? "national" : "club",
    official: isAdmin ? v.official !== false : false,
    players: playersRaw.map((p) => normalizeImportedPlayer(p, name)),
    bench: benchRaw.map((p) => normalizeImportedPlayer(p, name)),
  };
}

export function parseImportedTeams(raw: unknown, isAdmin: boolean): TeamImport[] {
  const source = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.teams)
      ? raw.teams
      : [raw];
  return source.map((item) => normalizeImportedTeam(item, isAdmin));
}
