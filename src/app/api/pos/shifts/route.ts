import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { findOpenShift } from "@/lib/pos";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<any>(
      `SELECT s.*, c.name AS cashier_name,
              (SELECT COUNT(*) FROM pos_sales p WHERE p.shift_id = s.id AND p.status='completed') AS sale_count,
              (SELECT COALESCE(SUM(total),0) FROM pos_sales p WHERE p.shift_id = s.id AND p.status='completed') AS sales_total
       FROM pos_shifts s JOIN pos_cashiers c ON c.id = s.cashier_id
       ORDER BY s.opened_at DESC`
    );
    return NextResponse.json({
      shifts: rows.map((r: any) => ({
        id: r.id,
        cashierId: r.cashier_id,
        cashierName: r.cashier_name,
        openingFloat: Number(r.opening_float),
        closingFloat: r.closing_float !== null ? Number(r.closing_float) : null,
        expectedCash: r.expected_cash !== null ? Number(r.expected_cash) : null,
        cashDifference: r.cash_difference !== null ? Number(r.cash_difference) : null,
        status: r.status,
        openedAt: r.opened_at,
        closedAt: r.closed_at,
        saleCount: Number(r.sale_count),
        salesTotal: Number(r.sales_total),
      })),
    });
  } catch (err) {
    console.error("pos shifts GET error:", err);
    return NextResponse.json({ error: "Could not load shifts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: { cashierId?: number; openingFloat?: number };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.cashierId) return NextResponse.json({ error: "Missing cashier" }, { status: 400 });

  try {
    const existing = await findOpenShift(b.cashierId);
    if (existing) {
      return NextResponse.json({ error: "This cashier already has an open shift" }, { status: 409 });
    }
    const openingFloat = Number(b.openingFloat) || 0;
    const result = await query<any>(
      "INSERT INTO pos_shifts (cashier_id, opening_float, status) VALUES (?, ?, 'open')",
      [b.cashierId, openingFloat]
    );
    const shiftId = (result as any).insertId;
    return NextResponse.json({ ok: true, shiftId });
  } catch (err) {
    console.error("pos shifts POST error:", err);
    return NextResponse.json({ error: "Could not open shift" }, { status: 500 });
  }
}
