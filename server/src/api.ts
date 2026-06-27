import type { Express, Response } from "express";
import express from "express";
import { signup, login, authMiddleware, requireAuth, type AuthRequest, type AuthUser } from "./auth.js";
import {
  getVisibleTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  findTeamByNameSeason,
  getAchievementProgress,
  unlockAchievement,
  grantExperience,
  getUserProgress,
  getLeaderboard,
  createFeedback,
  getFeedback,
  getFeedbackCountForUser,
  normalizeFeedbackInput,
  maskTeamName,
  type DbTeam,
  type FeedbackInput,
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
const PLAYER_ATTRIBUTES = ["pac", "sho", "pas", "dri", "def", "phy"] as const;
const FEEDBACK_CATEGORY_LABELS = new Set([
  "suggestion",
  "bug",
  "balance",
  "other",
]);
const MAX_FEEDBACK_PER_USER = 3;

function validateTeam(t: TeamInput): string | null {
  if (!t || typeof t.name !== "string" || !t.name.trim()) return "Nome do time é obrigatório.";
  if (!Array.isArray(t.players) || t.players.length !== 11)
    return "O time precisa de exatamente 11 titulares.";
  for (const p of [...t.players, ...(t.bench ?? [])]) {
    if (!p || typeof p.name !== "string" || !p.name.trim()) return "Todo jogador precisa de um nome.";
    if (!VALID_POS.has(p.pos)) return `Posição inválida: ${p.pos}.`;
    if (p.altPositions?.some((pos) => !VALID_POS.has(pos))) return `Posição alternativa inválida em ${p.name}.`;
    if (typeof p.rating !== "number" || p.rating < 40 || p.rating > 99) return "Rating deve ser entre 40 e 99.";
    for (const attr of PLAYER_ATTRIBUTES) {
      const value = p[attr];
      if (value == null) continue;
      if (typeof value !== "number" || value < 1 || value > 99)
        return `${attr.toUpperCase()} deve ser entre 1 e 99.`;
    }
  }
  return null;
}

function canEdit(t: DbTeam, u: AuthUser): boolean {
  return t.ownerId ? t.ownerId === u.id : u.role === "admin";
}

function validateFeedback(input: FeedbackInput): string | null {
  if (!FEEDBACK_CATEGORY_LABELS.has(String(input.category)))
    return "Tipo de feedback invÃ¡lido.";
  const normalized = normalizeFeedbackInput(input);
  if (normalized.message.length < 10)
    return "Escreva pelo menos 10 caracteres.";
  if (normalized.message.length > 2400)
    return "Mensagem muito longa.";
  return null;
}

function requireAdminUser(req: AuthRequest, res: Response): AuthUser | null {
  const u = req.authUser;
  if (!u) {
    res.status(401).json({ error: "Faça login para continuar." });
    return null;
  }
  if (u.role !== "admin") {
    res.status(403).json({ error: "Apenas administradores podem gerenciar times." });
    return null;
  }
  return u;
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

  app.get("/api/leaderboard", async (req, res) => {
    res.json({ leaderboard: await getLeaderboard(Number(req.query.limit) || 10) });
  });

  app.get("/api/progress", requireAuth, async (req: AuthRequest, res) => {
    res.json({ progress: await getUserProgress(req.authUser!.id) });
  });

  app.get("/api/achievements", requireAuth, async (req: AuthRequest, res) => {
    res.json({ achievements: await getAchievementProgress(req.authUser!.id) });
  });

  app.post("/api/achievements/:id/unlock", requireAuth, async (req: AuthRequest, res) => {
    const unlocked = await unlockAchievement(req.authUser!.id, req.params.id);
    res.json({ unlocked, progress: await getUserProgress(req.authUser!.id) });
  });

  app.post("/api/xp", requireAuth, async (req: AuthRequest, res) => {
    const amount = Math.round(Number(req.body?.amount));
    const sourceKey = String(req.body?.sourceKey ?? "");
    const reason = String(req.body?.reason ?? "");
    if (!Number.isFinite(amount) || amount <= 0)
      return res.status(400).json({ error: "XP inválido." });
    const r = await grantExperience(req.authUser!.id, sourceKey, amount, reason);
    res.json(r);
  });

  app.post("/api/feedback", requireAuth, async (req: AuthRequest, res) => {
    const body = {
      category: String(req.body?.category ?? "other"),
      message: String(req.body?.message ?? ""),
      contact: String(req.body?.contact ?? ""),
      page: String(req.body?.page ?? ""),
      userAgent: req.get("user-agent") ?? String(req.body?.userAgent ?? ""),
    } as FeedbackInput;
    const err = validateFeedback(body);
    if (err) return res.status(400).json({ error: err });
    const sentCount = await getFeedbackCountForUser(req.authUser!.id);
    if (sentCount >= MAX_FEEDBACK_PER_USER) {
      return res.status(429).json({
        error: "Você já enviou 3 feedbacks. Obrigado por ajudar o Pebol.",
      });
    }
    const feedback = await createFeedback(req.authUser!.id, body);
    res.json({ feedback });
  });

  app.get("/api/feedback", requireAuth, async (req: AuthRequest, res) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    res.json({ feedback: await getFeedback(Number(req.query.limit) || 50) });
  });

  app.get("/api/teams", async (req: AuthRequest, res) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    const teams = await getVisibleTeams(u.id, u.role);
    res.json({ teams: teams.map((t) => forClient(t, u)) });
  });

  app.get("/api/teams/:id", async (req: AuthRequest, res: Response) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    const t = await getTeamById(req.params.id);
    if (!t) return res.status(404).json({ error: "Time não encontrado." });
    if (t.ownerId && t.ownerId !== u.id && u.role !== "admin")
      return res.status(403).json({ error: "Sem acesso a este time." });
    res.json({ team: forClient(t, u) });
  });

  app.post("/api/teams", requireAuth, async (req: AuthRequest, res) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    const body = req.body as TeamInput & { official?: boolean; kind?: "club" | "national" };
    const err = validateTeam(body);
    if (err) return res.status(400).json({ error: err });
    const official = body.official !== false;
    const ownerId = official ? null : u.id;
    const dup = await findTeamByNameSeason(body.name, body.season ?? "", ownerId);
    if (dup) {
      const label = dup.season ? `${dup.name} ${dup.season}` : dup.name;
      return res.status(409).json({ error: `Já existe um time com esse nome (${label}).` });
    }
    const t = await createTeam(body, body.kind === "national" ? "national" : "club", ownerId);
    if (!t.ownerId) onOfficialChange();
    res.json({ team: t });
  });

  app.put("/api/teams/:id", requireAuth, async (req: AuthRequest, res) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    const existing = await getTeamById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Time não encontrado." });
    if (!canEdit(existing, u)) return res.status(403).json({ error: "Você não pode editar este time." });
    const err = validateTeam(req.body);
    if (err) return res.status(400).json({ error: err });
    const body = req.body as TeamInput;
    const dup = await findTeamByNameSeason(body.name, body.season ?? "", existing.ownerId);
    if (dup && dup.id !== existing.id) {
      const label = dup.season ? `${dup.name} ${dup.season}` : dup.name;
      return res.status(409).json({ error: `Já existe outro time com esse nome (${label}).` });
    }
    const t = await updateTeam(req.params.id, req.body);
    if (!existing.ownerId) onOfficialChange();
    res.json({ team: t });
  });

  app.delete("/api/teams/:id", requireAuth, async (req: AuthRequest, res) => {
    const u = requireAdminUser(req, res);
    if (!u) return;
    const existing = await getTeamById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Time não encontrado." });
    if (!canEdit(existing, u)) return res.status(403).json({ error: "Você não pode excluir este time." });
    await deleteTeam(req.params.id);
    if (!existing.ownerId) onOfficialChange();
    res.json({ ok: true });
  });
}
