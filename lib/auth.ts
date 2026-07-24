import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { queryOne } from "./db";

export const SESSION_COOKIE = "session";
const TOKEN_TTL = "30d";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export type SessionUser = { id: string; email: string; name: string };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, secret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, secret()) as any;
    return { id: decoded.id, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

/** Read the current user from the session cookie (for use in route handlers). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Confirm a user is a caregiver on a child; returns their role or null. */
export async function caregiverRole(userId: string, childId: string): Promise<string | null> {
  const row = await queryOne<{ role: string }>(
    "select role from caregivers where user_id = $1 and child_id = $2",
    [userId, childId]
  );
  return row?.role ?? null;
}
