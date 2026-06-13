// REST client for auth + team CRUD (separate from net.ts, which is the socket layer).
import type { Team } from "../../shared/types.js";

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

let token: string | null = localStorage.getItem("pebol_token");
export function getToken(): string | null {
  return token;
}
export function setToken(t: string | null): void {
  token = t;
  if (t) localStorage.setItem("pebol_token", t);
  else localStorage.removeItem("pebol_token");
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
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
  achievements: () => req<{ achievements: AchievementProgress[] }>("/api/achievements"),
  unlockAchievement: (id: string) =>
    req<{ unlocked: boolean }>(`/api/achievements/${id}/unlock`, { method: "POST" }),
  listTeams: () => req<{ teams: AdminTeam[] }>("/api/teams"),
  createTeam: (t: Partial<AdminTeam> & { official?: boolean }) =>
    req<{ team: AdminTeam }>("/api/teams", { method: "POST", body: JSON.stringify(t) }),
  updateTeam: (id: string, t: Partial<AdminTeam>) =>
    req<{ team: AdminTeam }>(`/api/teams/${id}`, { method: "PUT", body: JSON.stringify(t) }),
  deleteTeam: (id: string) => req<{ ok: boolean }>(`/api/teams/${id}`, { method: "DELETE" }),
};
