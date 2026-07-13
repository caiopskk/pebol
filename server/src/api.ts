import type { Express, Response } from "express";
import express from "express";
import type { NextFunction } from "express";
import bcrypt from "bcryptjs";
import { signup, login, authMiddleware, requireAuth, issueToken, type AuthRequest, type AuthUser } from "./auth.js";
import {
  getVisibleTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  deleteManagerCareer,
  findTeamByNameSeason,
  getAchievementProgress,
  unlockAchievement,
  grantExperience,
  getUserProgress,
  getLeaderboard,
  createFeedback,
  getFeedback,
  getFeedbackCountForUser,
  getManagerCareerState,
  normalizeFeedbackInput,
  maskTeamName,
  getPublicUser,
  getUserPasswordHash,
  updatePublicUserProfile,
  updateUserAvatar,
  updateUserPasswordHash,
  buyManagerPlayer,
  createManagerSave,
  getManagerSave,
  getManagerSquad,
  getManagerStandings,
  listManagerStartTeams,
  searchManagerMarket,
  sellManagerPlayer,
  saveManagerCareerState,
  updateManagerLineup,
  upgradeManagerStadium,
  type DbTeam,
  type FeedbackInput,
  type TeamInput,
} from "./db.js";
import { managerNextOpponentStrength, managerSchedule, playManagerRound } from "./managerEngine.js";
import {
  fetchAvatarImage,
  localUploadsDir,
  saveAvatarImage,
  validateAvatarUpload,
} from "./storage.js";

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
const AVATAR_UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const AVATAR_UPLOAD_MIN_INTERVAL_MS = 30 * 1000;
const MAX_AVATAR_UPLOADS_PER_WINDOW = 5;
const avatarUploadAttempts = new Map<string, number[]>();

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

async function managerDashboard(userId: string) {
  const save = await getManagerSave(userId);
  if (!save) return { save: null };
  const standings = await getManagerStandings(save.id);
  const squad = await getManagerSquad(save.id, save.teamId);
  const nextFixture =
    managerSchedule(standings, save.round).find(
      (f) => f.homeTeamId === save.teamId || f.awayTeamId === save.teamId,
    ) ?? null;
  return {
    save,
    squad,
    standings,
    nextFixture,
    nextOpponentStrength: await managerNextOpponentStrength(save),
  };
}

function avatarUploadRateLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const userId = req.authUser?.id;
  if (!userId) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }

  const now = Date.now();
  const recent = (avatarUploadAttempts.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < AVATAR_UPLOAD_WINDOW_MS,
  );
  const lastAttempt = recent.at(-1);

  if (
    lastAttempt !== undefined &&
    now - lastAttempt < AVATAR_UPLOAD_MIN_INTERVAL_MS
  ) {
    const retryAfter = Math.ceil(
      (AVATAR_UPLOAD_MIN_INTERVAL_MS - (now - lastAttempt)) / 1000,
    );
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: `Aguarde ${retryAfter}s antes de enviar outra imagem.`,
    });
    return;
  }

  if (recent.length >= MAX_AVATAR_UPLOADS_PER_WINDOW) {
    const retryAfter = Math.ceil(
      (AVATAR_UPLOAD_WINDOW_MS - (now - recent[0])) / 1000,
    );
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Limite de 5 uploads de avatar por hora atingido.",
    });
    return;
  }

  recent.push(now);
  avatarUploadAttempts.set(userId, recent);
  next();
}

/** Register auth + team CRUD routes. `onOfficialChange` refreshes the game's team cache. */
export function registerApi(app: Express, onOfficialChange: () => void): void {
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(localUploadsDir(), { maxAge: "1y", immutable: true }));
  app.use(authMiddleware);

  app.get("/avatar/:userId/:fileName", async (req, res) => {
    const key = `avatars/${req.params.userId}/${req.params.fileName}`;
    const image = await fetchAvatarImage(key);
    if (!image) {
      res.sendStatus(404);
      return;
    }
    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(image.buffer);
  });

  app.post("/api/auth/signup", async (req, res) => {
    const r = await signup(req.body?.username, req.body?.password);
    res.status("error" in r ? 400 : 200).json(r);
  });
  app.post("/api/auth/login", async (req, res) => {
    const r = await login(req.body?.username, req.body?.password);
    res.status("error" in r ? 401 : 200).json(r);
  });
  app.get("/api/me", async (req: AuthRequest, res) => {
    if (!req.authUser) return res.json({ user: null });
    res.json({ user: await getPublicUser(req.authUser.id) });
  });

  app.put("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    const current = await getPublicUser(req.authUser!.id);
    if (!current) return res.status(404).json({ error: "Usuário não encontrado." });

    const username = String(req.body?.username ?? current.username).trim();
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: "Usuário deve ter 3 a 20 caracteres." });
    }

    if (newPassword) {
      if (newPassword.length < 4)
        return res.status(400).json({ error: "Senha muito curta (mínimo 4)." });
      const hash = await getUserPasswordHash(current.id);
      if (!hash || !bcrypt.compareSync(currentPassword, hash)) {
        return res.status(400).json({ error: "Senha atual inválida." });
      }
      await updateUserPasswordHash(current.id, bcrypt.hashSync(newPassword, 10));
    }

    let user = current;
    if (username !== current.username) {
      const updated = await updatePublicUserProfile(current.id, username);
      if ("error" in updated) return res.status(409).json(updated);
      user = updated;
    }

    res.json({ user, token: issueToken(user) });
  });

  app.put(
    "/api/profile/avatar",
    requireAuth,
    avatarUploadRateLimit,
    express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "2mb" }),
    async (req: AuthRequest, res) => {
      const contentType = String(req.get("content-type") ?? "").split(";")[0].trim();
      const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      const validation = validateAvatarUpload(contentType, bytes.length);
      if ("error" in validation) return res.status(400).json(validation);

      const saved = await saveAvatarImage({
        userId: req.authUser!.id,
        bytes,
        contentType,
        ext: validation.ext,
      });
      const avatarUrl = `${req.protocol}://${req.get("host")}${saved.url}`;
      const user = await updateUserAvatar(req.authUser!.id, avatarUrl, saved.key);
      if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
      res.json({
        user,
        token: issueToken(user),
        avatar: { ...saved, url: avatarUrl },
      });
    },
  );

  app.get("/api/leaderboard", async (req, res) => {
    const limit = req.query.all === "1" ? null : Number(req.query.limit) || 10;
    res.json({ leaderboard: await getLeaderboard(limit) });
  });

  app.get("/api/users/:id/profile", async (req, res) => {
    const user = await getPublicUser(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const [progress, achievements] = await Promise.all([
      getUserProgress(user.id),
      getAchievementProgress(user.id),
    ]);
    res.json({
      profile: {
        user,
        progress,
        achievements: achievements.filter((achievement) => achievement.unlockedAt !== null),
      },
    });
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

  app.get("/api/manager/teams", requireAuth, async (_req: AuthRequest, res) => {
    res.json({ teams: await listManagerStartTeams() });
  });

  app.get("/api/manager/save", requireAuth, async (req: AuthRequest, res) => {
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.get("/api/manager/career-state", requireAuth, async (req: AuthRequest, res) => {
    const raw = await getManagerCareerState(req.authUser!.id);
    if (!raw) return res.json({ state: null });
    try {
      res.json({ state: JSON.parse(raw) });
    } catch {
      res.json({ state: null });
    }
  });

  app.put("/api/manager/career-state", requireAuth, async (req: AuthRequest, res) => {
    const state = req.body?.state;
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return res.status(400).json({ error: "Save de carreira inválido." });
    }
    await saveManagerCareerState(req.authUser!.id, JSON.stringify(state));
    res.json({ ok: true });
  });

  app.delete("/api/manager/career-state", requireAuth, async (req: AuthRequest, res) => {
    await deleteManagerCareer(req.authUser!.id);
    res.json({ ok: true });
  });

  app.post("/api/manager/start", requireAuth, async (req: AuthRequest, res) => {
    const teamId = String(req.body?.teamId ?? "");
    const save = await createManagerSave(req.authUser!.id, teamId);
    if ("error" in save) return res.status(400).json(save);
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.get("/api/manager/market", requireAuth, async (req: AuthRequest, res) => {
    const save = await getManagerSave(req.authUser!.id);
    if (!save) return res.status(404).json({ error: "Crie uma carreira primeiro." });
    const pos = String(req.query.pos ?? "");
    const players = await searchManagerMarket(save, {
      pos: VALID_POS.has(pos) ? pos : undefined,
      minRating: Number(req.query.minRating) || undefined,
      maxRating: Number(req.query.maxRating) || undefined,
    });
    res.json({ players });
  });

  app.post("/api/manager/buy", requireAuth, async (req: AuthRequest, res) => {
    const result = await buyManagerPlayer(req.authUser!.id, String(req.body?.playerId ?? ""));
    if ("error" in result) return res.status(400).json(result);
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.post("/api/manager/sell", requireAuth, async (req: AuthRequest, res) => {
    const result = await sellManagerPlayer(req.authUser!.id, String(req.body?.playerId ?? ""));
    if ("error" in result) return res.status(400).json(result);
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.post("/api/manager/stadium", requireAuth, async (req: AuthRequest, res) => {
    const result = await upgradeManagerStadium(req.authUser!.id);
    if ("error" in result) return res.status(400).json(result);
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.post("/api/manager/squad", requireAuth, async (req: AuthRequest, res) => {
    const result = await updateManagerLineup(req.authUser!.id, {
      formationId: String(req.body?.formationId ?? "4-3-3"),
      mentality: String(req.body?.mentality ?? "equilibrada") as any,
      attackFocus: String(req.body?.attackFocus ?? "equilibrado") as any,
      starters: Array.isArray(req.body?.starters) ? req.body.starters : [],
    });
    if ("error" in result) return res.status(400).json(result);
    res.json(await managerDashboard(req.authUser!.id));
  });

  app.post("/api/manager/round", requireAuth, async (req: AuthRequest, res) => {
    const result = await playManagerRound(req.authUser!.id);
    if ("error" in result) return res.status(400).json(result);
    res.json({ result });
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
