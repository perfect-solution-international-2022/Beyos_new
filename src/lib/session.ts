import { jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "beyos_session";
export const SRI_LANKA_TIME_ZONE = "Asia/Colombo";
const SRI_LANKA_OFFSET_SECONDS = 5 * 60 * 60 + 30 * 60;

export type SessionRole = "buyer" | "reseller" | "admin";
export type AdminRole = "super" | "manager" | "cashier";

export interface SessionPayload extends JWTPayload {
  uid: number;
  role: SessionRole;
  sv: number;
  ar?: AdminRole;
}

export function sessionSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === "dev-insecure-secret-change-me") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be configured with a strong production value");
    }
    return new TextEncoder().encode("dev-insecure-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

/** UTC epoch (seconds) at the start of the current Sri Lankan calendar day. */
export function sriLankaDayStartedAt(nowMs = Date.now()): number {
  const nowSeconds = Math.floor(nowMs / 1000);
  return Math.floor((nowSeconds + SRI_LANKA_OFFSET_SECONDS) / 86_400) * 86_400 - SRI_LANKA_OFFSET_SECONDS;
}

/** Sessions expire at the next 00:00 in Sri Lanka, never after it. */
export function nextSriLankaMidnight(nowMs = Date.now()): number {
  return sriLankaDayStartedAt(nowMs) + 86_400;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (
      typeof payload.uid !== "number" ||
      typeof payload.sv !== "number" ||
      !["buyer", "reseller", "admin"].includes(String(payload.role)) ||
      (payload.ar !== undefined && !["super", "manager", "cashier"].includes(String(payload.ar)))
    ) {
      return null;
    }
    // This also invalidates older seven-day tokens at the first Sri Lankan
    // midnight after this rule is deployed.
    if (typeof payload.iat !== "number" || payload.iat < sriLankaDayStartedAt()) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
