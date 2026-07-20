import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { cashSalesTotal } from "@/lib/pos";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await query<any>(
      `SELECT s.*, c.name AS cashier_name FROM pos_shifts s
       JOIN pos_cashiers c ON c.id = s.cashier_id WHERE s.id = ? LIMIT 1`,
      [params.id]
    );
    const shift = rows[0];
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

    const sales = await query<any>(
      "SELECT * FROM pos_sales WHERE shift_id = ? ORDER BY created_at DESC",
      [params.id]
    );

    return NextResponse.json({
      shift: {
        id: shift.id,
        cashierId: shift.cashier_id,
        cashierName: shift.cashier_name,
        openingFloat: Number(shift.opening_float),
        closingFloat: shift.closing_float !== null ? Number(shift.closing_float) : null,
        expectedCash: shift.expected_cash !== null ? Number(shift.expected_cash) : null,
        cashDifference: shift.cash_difference !== null ? Number(shift.cash_difference) : null,
        status: shift.status,
        openedAt: shift.opened_at,
        closedAt: shift.closed_at,
      },
      sales: sales.map((s: any) => ({
        receiptNumber: s.receipt_number,
        customerName: s.customer_name,
        total: Number(s.total),
        paymentMethod: s.payment_method,
        status: s.status,
        createdAt: s.created_at,
      })),
    });
  } catch (err) {
    console.error("pos shift detail GET error:", err);
    return NextResponse.json({ error: "Could not load shift" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: { closingFloat?: number };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (b.closingFloat === undefined || b.closingFloat === null) {
    return NextResponse.json({ error: "Closing cash amount is required" }, { status: 400 });
  }

  try {
    const rows = await query<{ id: number; opening_float: string; status: string }>(
      "SELECT id, opening_float, status FROM pos_shifts WHERE id = ? LIMIT 1",
      [params.id]
    );
    const shift = rows[0];
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    if (shift.status !== "open") {
      return NextResponse.json({ error: "This shift is already closed" }, { status: 400 });
    }

    const cashSales = await cashSalesTotal(shift.id);
    const expectedCash = Number(shift.opening_float) + cashSales;
    const closingFloat = Number(b.closingFloat);
    const cashDifference = closingFloat - expectedCash;

    await query(
      `UPDATE pos_shifts SET closing_float = ?, expected_cash = ?, cash_difference = ?,
        status = 'closed', closed_at = NOW() WHERE id = ?`,
      [closingFloat, expectedCash, cashDifference, shift.id]
    );

    return NextResponse.json({
      ok: true,
      expectedCash,
      closingFloat,
      cashDifference,
    });
  } catch (err) {
    console.error("pos shift close PATCH error:", err);
    return NextResponse.json({ error: "Could not close shift" }, { status: 500 });
  }
}
