import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { query } from "./db";

const COOKIE_NAME = "beyos_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type UserRole = "buyer" | "reseller" | "admin";

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE_NAME);
}

async function getSessionUserId(): Promise<number | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  const rows = await query<DbUser>(
    "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
    [uid]
  );
  if (rows.length === 0) return null;
  const u = rows[0];
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

export function findUserByEmail(email: string): Promise<DbUser[]> {
  return query<DbUser>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
}
