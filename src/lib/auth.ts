import { cookies } from "next/headers";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { query } from "./db";
import {
  SESSION_COOKIE_NAME,
  nextSriLankaMidnight,
  sessionSecretKey,
  verifySessionToken,
} from "./session";

export type UserRole = "buyer" | "reseller" | "admin";
export type AdminRole = "super" | "manager" | "cashier";

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  admin_role: AdminRole | null;
  reseller_status: "pending" | "approved" | "suspended" | "rejected";
  account_status: "active" | "suspended" | "disabled";
  session_version: number;
  created_at: string;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  adminRole: AdminRole | null;
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
  const rows = await query<Pick<DbUser, "role" | "admin_role" | "reseller_status" | "account_status" | "session_version">>(
    "SELECT role, admin_role, reseller_status, account_status, session_version FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [userId]
  );
  if (!rows[0]) throw new Error("Cannot create a session for an unknown user");
  if (rows[0].account_status !== "active") throw new Error("This account is not active");
  const effectiveRole: UserRole = rows[0].role === "reseller" && rows[0].reseller_status !== "approved"
    ? "buyer"
    : rows[0].role;

  const token = await new SignJWT({
    uid: userId,
    role: effectiveRole,
    sv: Number(rows[0].session_version),
    ...(effectiveRole === "admin" && rows[0].admin_role ? { ar: rows[0].admin_role } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(nextSriLankaMidnight())
    .sign(sessionSecretKey());

  const maxAge = Math.max(1, nextSriLankaMidnight() - Math.floor(Date.now() / 1000));

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

async function getSessionUserId(): Promise<number | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  return payload ? payload.uid : null;
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  const rows = await query<DbUser>(
    "SELECT id, name, email, role, admin_role, reseller_status, account_status, session_version FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [uid]
  );
  if (rows.length === 0) return null;
  const u = rows[0];
  if (u.account_status !== "active") return null;
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.sv !== Number(u.session_version)) return null;
  const effectiveRole: UserRole = u.role === "reseller" && u.reseller_status !== "approved" ? "buyer" : u.role;
  if (session.role !== effectiveRole) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: effectiveRole,
    adminRole: effectiveRole === "admin" ? u.admin_role : null,
  };
}

export function findUserByEmail(email: string): Promise<DbUser[]> {
  return query<DbUser>("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1", [email]);
}
