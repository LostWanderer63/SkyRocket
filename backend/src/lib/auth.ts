import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";

const SECRET = process.env.JWT_SECRET ?? "dev-skyroute-secret-change-me";
const SHORT_EXPIRES = "1d";
const LONG_EXPIRES = "30d";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "demo@skyroute.test")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface TokenPayload extends AuthUser {
  v?: number; // token version — bumped to invalidate all sessions
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function signToken(user: AuthUser, remember = false, version = 0): string {
  return jwt.sign({ ...user, v: version }, SECRET, { expiresIn: remember ? LONG_EXPIRES : SHORT_EXPIRES });
}

function decode(req: Request): TokenPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Resolves a token to a live user, rejecting tokens whose version is stale
// (i.e. issued before a "log out everywhere"). Returns null if invalid.
async function resolveUser(req: Request): Promise<AuthUser | null> {
  const payload = decode(req);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) return null;
  if ((payload.v ?? 0) !== user.tokenVersion) return null;
  return { id: user.id, email: user.email, name: user.name };
}

// Attaches req.user when a valid (current-version) token is present.
export async function authOptional(req: Request, _res: Response, next: NextFunction) {
  req.user = (await resolveUser(req)) ?? undefined;
  next();
}

// Blocks unless a valid current-version token is present.
export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

// Blocks unless the authenticated user is an admin.
export async function authAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  if (!isAdmin(user.email)) return res.status(403).json({ error: "Admin access required" });
  req.user = user;
  next();
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
