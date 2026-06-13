import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "pebol-dev-secret-change-me";
// usernames listed here are always admins (besides the very first registered user)
const ADMIN_USERS = (process.env.ADMIN_USERS || "").split(",").map((s) => s.trim()).filter(Boolean);

export type Role = "user" | "admin";
export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}
export type AuthResult = { user: AuthUser; token: string } | { error: string };

function sign(u: AuthUser): string {
  return jwt.sign({ sub: u.id, username: u.username, role: u.role }, JWT_SECRET, { expiresIn: "30d" });
}

export async function signup(username: string, password: string): Promise<AuthResult> {
  username = (username || "").trim();
  if (username.length < 3 || username.length > 20) return { error: "Usuário deve ter 3 a 20 caracteres." };
  if ((password || "").length < 4) return { error: "Senha muito curta (mínimo 4)." };
  const exists = await db.execute({ sql: "SELECT 1 FROM users WHERE username = ?", args: [username] });
  if (exists.rows.length) return { error: "Esse usuário já existe." };
  const count = await db.execute("SELECT count(*) AS c FROM users");
  const isFirst = Number(count.rows[0].c) === 0;
  const role: Role = isFirst || ADMIN_USERS.includes(username) ? "admin" : "user";
  const id = randomUUID();
  try {
    await db.execute({
      sql: "INSERT INTO users (id,username,password_hash,role,created_at) VALUES (?,?,?,?,?)",
      args: [id, username, bcrypt.hashSync(password, 10), role, Date.now()],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("users.username")) {
      return { error: "Esse usuário já existe. Entre com essa conta ou escolha outro nome." };
    }
    throw err;
  }
  const user: AuthUser = { id, username, role };
  return { user, token: sign(user) };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const r = await db.execute({ sql: "SELECT * FROM users WHERE username = ?", args: [(username || "").trim()] });
  if (!r.rows.length) return { error: "Usuário ou senha inválidos." };
  const row = r.rows[0] as Record<string, unknown>;
  if (!bcrypt.compareSync(password || "", String(row.password_hash)))
    return { error: "Usuário ou senha inválidos." };
  const user: AuthUser = { id: String(row.id), username: String(row.username), role: String(row.role) as Role };
  return { user, token: sign(user) };
}

export function userFromToken(token?: string): AuthUser | null {
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET) as { sub: string; username: string; role: Role };
    return { id: p.sub, username: p.username, role: p.role };
  } catch {
    return null;
  }
}

// Express request augmented with the (optional) authenticated user.
export interface AuthRequest extends Request {
  authUser?: AuthUser | null;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
  req.authUser = userFromToken(token);
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Faça login para continuar." });
    return;
  }
  next();
}
