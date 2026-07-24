import crypto from "crypto";
import { query } from "@/lib/db";

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 60;
const MAX_REQUESTS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** True if this user has requested too many resets recently — basic abuse guard. */
export async function isRateLimited(userId: number): Promise<boolean> {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM password_reset_tokens
     WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [userId, RATE_LIMIT_WINDOW_MINUTES]
  );
  return Number(rows[0]?.count ?? 0) >= MAX_REQUESTS_PER_WINDOW;
}

/** Creates a reset token for the user and returns the raw (unhashed) token to email. */
export async function createPasswordResetToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  await query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, hash, expiresAt]
  );
  return raw;
}

/**
 * Validates and burns a reset token. Returns the associated user id if the
 * token exists, hasn't been used, and hasn't expired — otherwise null.
 * Also invalidates every other outstanding token for that user, since a
 * successful reset proves email ownership and any older links should die.
 */
export async function consumePasswordResetToken(rawToken: string): Promise<number | null> {
  const hash = hashToken(rawToken);
  const rows = await query<{
    id: number;
    user_id: number;
    expires_at: string;
    used_at: string | null;
  }>(
    "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1",
    [hash]
  );
  const row = rows[0];
  if (!row || row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  await query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
    [row.user_id]
  );
  return row.user_id;
}
