import { jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = "beyos_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionRole = "buyer" | "reseller" | "admin";

export interface SessionPayload extends JWTPayload {
  uid: number;
  role: SessionRole;
  sv: number;
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

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (
      typeof payload.uid !== "number" ||
      typeof payload.sv !== "number" ||
      !["buyer", "reseller", "admin"].includes(String(payload.role))
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
