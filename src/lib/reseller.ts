import { query } from "./db";
import { getCurrentUser, PublicUser } from "./auth";

/** Returns the current user only if they are a reseller, else null. */
export async function requireReseller(): Promise<PublicUser | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "reseller") return null;
  return user;
}

export function makeRef(prefix: string): string {
  const d = new Date();
  const stamp =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}-${stamp}-${rand}`;
}

/** Wallet balance = profit from completed orders − non-rejected withdrawals. */
export async function walletBalance(resellerId: number): Promise<number> {
  const earned = await query<{ total: string | null }>(
    "SELECT COALESCE(SUM(profit),0) AS total FROM reseller_orders WHERE reseller_id = ? AND status = 'completed'",
    [resellerId]
  );
  const withdrawn = await query<{ total: string | null }>(
    "SELECT COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE reseller_id = ? AND status <> 'rejected'",
    [resellerId]
  );
  return Number(earned[0]?.total ?? 0) - Number(withdrawn[0]?.total ?? 0);
}
