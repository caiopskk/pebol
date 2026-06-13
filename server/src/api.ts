import type { Express, Response } from "express";
import express from "express";
import { signup, login, authMiddleware, requireAuth, type AuthRequest, type AuthUser } from "./auth.js";
import {
  getVisibleTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getAchievementProgress,
  unlockAchievement,
  maskTeamName,
  type DbTeam,
  type TeamInput,
} from "./db.js";

// Non-admins never receive the real name of an official club (copyright); they get the
// generic alias as the name. Admins get the full record (real name + alias) to edit.
function forClient(t: DbTeam, u?: AuthUser | null): DbTeam {
  if (u?.role === "admin") return t;
  return { ...t, name: maskTeamName(t, false), alias: "" };
}

const VALID_POS = new Set([
  "GK", "RB", "LB", "CB", "RWB", "LWB", "CDM", "CM", "CAM", "RM", "LM", "RW", "LW", "CF", "ST",
]);

function validateTeam(t: TeamInput): string | null {
  if (!t || typeof t.name !== "string" || !t.name.trim()) return "Nome do time é obrigatório.";
  if (!Array.isArray(t.players) || t.players.length !== 11)
    return "O time precisa de exatamente 11 titulares.";
  for (const p of [...t.players, ...(t.bench ?? [])]) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) return "Todo jogador precisa de um nome.";
    if (!VALID_POS.has(p.pos)) return `Posição inválida: ${p.pos}.`;
    if (p.altPositions?.some((pos) => !VALID_POS.has(pos))) return `Posição alternativa inválida em ${p.name}.`;
    if (typeof p.rating !== "number" || p.rating < 40 || p.rating > 99) return "Rating deve ser entre 40 e 99.";
  }
  return null;
}

function canEdit(t: DbTeam, u: AuthUser): boolean {
  return t.ownerId ? t.ownerId === u.id : u.role === "admin";
}

/** Register auth + team CRUD routes. `onOfficialChange` refreshes the game's team cache. */
export function registerApi(app: Express, onOfficialChange: () => void): void {
  app.use(express.json({ limit: "256kb" }));
  app.use(authMiddleware);

  app.post("/api/auth/signup", async (req, res) => {
    const r = await signup(req.body?.username, req.body?.password);
    res.status("error" in r ? 400 : 200).json(r);
  });
  app.post("/api/auth/login", async (req, res) => {
    const r = await login(req.body?.username, req.body?.password);
    res.status("error" in r ? 401 : 200).json(r);
  });
  app.get("/api/me", (req: AuthRequest, res) => res.json({ user: req.authUser ?? null }));

  app.get("/api/achievements", requireAuth, async (req: AuthRequest, res) => {
    res.json({ achievements: await getAchievementProgress(req.authUser!.id) });
  });

  app.post("/api/achievements/:id/unlock", requireAuth, async (req: AuthRequest, res) => {
    const unlocked = await unlockAchievement(req.authUser!.id, req.params.id);
    res.json({ unlocked });
  });

  app.get("/api/teams", async (req: AuthRequest, res) => {
    const u = req.authUser;
    const teams = await getVisibleTeams(u?.id ?? null, u?.role ?? "user");
    res.json({ teams: teams.map((t) => forClient(t, u)) });
  });

  app.get("/api/teams/:id", async (req: AuthRequest, res: Response) => {
    const t = await getTeamById(req.params.id);
    if (!t) return res.status(404).json({ error: "Time não encontrado." });
    if (t.ownerId && t.ownerId !== req.authUser?.id && req.authUser?.role !== "admin")
      return res.status(403).json({ error: "Sem acesso a este time." });
    res.json({ team: forClient(t, req.authUser) });
  });

  app.post("/api/teams", requireAuth, async (req: AuthRequest, res) => {
    const body = req.body as TeamInput & { official?: boolean; kind?: "club" | "national" };
    const err = validateTeam(body);
    if (err) return res.status(400).json({ error: err });
    const u = req.authUser!;
    const official = !!body.official && u.role === "admin";
    const t = await createTeam(body, body.kind === "national" ? "national" : "club", official ? null : u.id);
    if (!t.ownerId) onOfficialChange();
    res.json({ team: t });
  });

  app.put("/api/teams/:id", requireAuth, async (req: AuthRequest, res) => {
    const existing = await getTeamById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Time não encontrado." });
    if (!canEdit(existing, req.authUser!)) return res.status(403).json({ error: "Você não pode editar este time." });
    const err = validateTeam(req.body);
    if (err) return res.status(400).json({ error: err });
    const t = await updateTeam(req.params.id, req.body);
    if (!existing.ownerId) onOfficialChange();
    res.json({ team: t });
  });

  app.delete("/api/teams/:id", requireAuth, async (req: AuthRequest, res) => {
    const existing = await getTeamById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Time não encontrado." });
    if (!canEdit(existing, req.authUser!)) return res.status(403).json({ error: "Você não pode excluir este time." });
    await deleteTeam(req.params.id);
    if (!existing.ownerId) onOfficialChange();
    res.json({ ok: true });
  });
}
