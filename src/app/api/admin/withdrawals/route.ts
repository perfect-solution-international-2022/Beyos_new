import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
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
  const admin = await requireAdmin();
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
    await query("UPDATE withdrawals SET status = ? WHERE withdraw_ref = ?", [status, withdrawRef]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin withdrawals PATCH error:", err);
    return NextResponse.json({ error: "Could not update withdrawal" }, { status: 500 });
  }
}
