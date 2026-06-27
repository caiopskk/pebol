// REST client for auth + team CRUD (separate from net.ts, which is the socket layer).
import type { Team } from "../../shared/types.js";
import type { LevelProgress } from "../../shared/progression.js";

const API_BASE =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? `${location.protocol}//${location.hostname}:3001` : "");

export type Role = "user" | "admin";
export interface AccountUser {
  id: string;
  username: string;
  role: Role;
}
export interface AdminTeam extends Team {
  kind: "club" | "national";
  ownerId: string | null;
  alias: string;
}
export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  sortOrder: number;
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
export type FeedbackCategory = "suggestion" | "bug" | "balance" | "other";
export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  contact?: string;
  page?: string;
}
export interface FeedbackEntry extends FeedbackPayload {
  id: string;
  userId: string;
  username: string;
  userAgent: string;
  status: "new" | "reviewed" | "archived";
  createdAt: number;
}

let token: string | null = localStorage.getItem("pebol_token");
let writeRequestLock:
  | {
      begin: () => void;
      end: () => void;
    }
  | null = null;

export function setWriteRequestLock(lock: typeof writeRequestLock): void {
  writeRequestLock = lock;
}

export function getToken(): string | null {
  return token;
}
export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem("pebol_token", t);
  else localStorage.removeItem("pebol_token");
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = String(opts.method ?? "GET").toUpperCase();
  const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (isWrite) writeRequestLock?.begin();
  try {
    const res = await fetch(API_BASE + path, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || "Erro de rede.");
    return data as T;
  } finally {
    if (isWrite) writeRequestLock?.end();
  }
}

export const api = {
  signup: (username: string, password: string) =>
    req<{ user: AccountUser; token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    req<{ user: AccountUser; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => req<{ user: AccountUser | null }>("/api/me"),
  leaderboard: () => req<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard"),
  progress: () => req<{ progress: UserProgress }>("/api/progress"),
  achievements: () => req<{ achievements: AchievementProgress[] }>("/api/achievements"),
  unlockAchievement: (id: string) =>
    req<{ unlocked: boolean; progress: UserProgress }>(`/api/achievements/${id}/unlock`, { method: "POST" }),
  grantXp: (amount: number, reason: string, sourceKey: string) =>
    req<{ granted: boolean; progress: UserProgress }>("/api/xp", {
      method: "POST",
      body: JSON.stringify({ amount, reason, sourceKey }),
    }),
  sendFeedback: (payload: FeedbackPayload) =>
    req<{ feedback: { id: string; createdAt: number } }>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listFeedback: () => req<{ feedback: FeedbackEntry[] }>("/api/feedback"),
  listTeams: () => req<{ teams: AdminTeam[] }>("/api/teams"),
  createTeam: (t: Partial<AdminTeam> & { official?: boolean }) =>
    req<{ team: AdminTeam }>("/api/teams", { method: "POST", body: JSON.stringify(t) }),
  updateTeam: (id: string, t: Partial<AdminTeam>) =>
    req<{ team: AdminTeam }>(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(t) }),
  deleteTeam: (id: string) => req<{ ok: boolean }>(`/api/teams/${id}`, { method: "DELETE" }),
};
