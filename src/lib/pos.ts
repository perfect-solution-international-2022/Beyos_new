import { query } from "@/lib/db";

export function makeReceiptNumber(): string {
  return (
    "BEYOS-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

/** Sum of cash-paid sales within a shift — used to compute the expected drawer amount at close-out. */
export async function cashSalesTotal(shiftId: number): Promise<number> {
  const rows = await query<{ total: string | null }>(
    "SELECT COALESCE(SUM(total),0) AS total FROM pos_sales WHERE shift_id = ? AND payment_method = 'cash' AND status = 'completed'",
    [shiftId]
  );
  return Number(rows[0]?.total ?? 0);
}

export interface OpenShift {
  id: number;
  cashierId: number;
  cashierName: string;
  openingFloat: number;
  openedAt: string;
}

/** Returns the currently open shift for a cashier, if any. */
export async function findOpenShift(cashierId: number): Promise<OpenShift | null> {
  const rows = await query<{
    id: number;
    cashier_id: number;
    cashier_name: string;
    opening_float: string;
    opened_at: string;
  }>(
    `SELECT s.id, s.cashier_id, c.name AS cashier_name, s.opening_float, s.opened_at
     FROM pos_shifts s JOIN pos_cashiers c ON c.id = s.cashier_id
     WHERE s.cashier_id = ? AND s.status = 'open' LIMIT 1`,
    [cashierId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    cashierId: r.cashier_id,
    cashierName: r.cashier_name,
    openingFloat: Number(r.opening_float),
    openedAt: r.opened_at,
  };
}
