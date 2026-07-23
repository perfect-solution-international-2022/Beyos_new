import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      withdraw_ref: string;
      reseller_name: string;
      amount: string;
      status: string;
      bank_snapshot: string;
      created_at: string;
    }>(
      `SELECT w.withdraw_ref, u.name AS reseller_name, w.amount, w.status, w.bank_snapshot, w.created_at
       FROM withdrawals w JOIN users u ON u.id = w.reseller_id
       ORDER BY w.created_at DESC`
    );
    return NextResponse.json({
      withdrawals: rows.map((r) => ({
        withdrawRef: r.withdraw_ref,
        resellerName: r.reseller_name,
        amount: Number(r.amount),
        status: r.status,
        bank: r.bank_snapshot,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("admin withdrawals GET error:", err);
    return NextResponse.json({ error: "Could not load withdrawals" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { withdrawRef?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { withdrawRef, status } = body;
  if (!withdrawRef || !["completed", "rejected", "pending"].includes(status || "")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        "SELECT reseller_id, amount, status FROM withdrawals WHERE withdraw_ref = ? LIMIT 1 FOR UPDATE", [withdrawRef]
      );
      const withdrawal = (rows as { reseller_id: number; amount: string; status: string }[])[0];
      if (!withdrawal) { await conn.rollback(); return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 }); }
      if (["completed", "rejected"].includes(withdrawal.status) && withdrawal.status !== status) {
        await conn.rollback();
        return NextResponse.json({ error: "A completed withdrawal decision cannot be changed" }, { status: 400 });
      }
      await conn.execute("UPDATE withdrawals SET status = ? WHERE withdraw_ref = ?", [status, withdrawRef]);
      if (status === "rejected" && withdrawal.status !== "rejected") {
        await conn.execute(
          `INSERT IGNORE INTO reseller_wallet_transactions
           (reseller_id, type, amount, reference_type, reference_id, description)
           VALUES (?,'reversal',?,'withdrawal',?,'Rejected withdrawal returned')`,
          [withdrawal.reseller_id, Number(withdrawal.amount), withdrawRef]
        );
      }
      await conn.commit();
    } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin withdrawals PATCH error:", err);
    return NextResponse.json({ error: "Could not update withdrawal" }, { status: 500 });
  }
}
