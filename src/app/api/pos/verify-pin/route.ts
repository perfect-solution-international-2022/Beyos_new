import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { verifyPassword } from "@/lib/auth";
import { findOpenShift } from "@/lib/pos";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: { cashierId?: number; pin?: string };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.cashierId || !b.pin) {
    return NextResponse.json({ error: "Missing cashier or PIN" }, { status: 400 });
  }

  try {
    const rows = await query<{ id: number; name: string; pin_hash: string; is_active: number }>(
      "SELECT id, name, pin_hash, is_active FROM pos_cashiers WHERE id = ? LIMIT 1",
      [b.cashierId]
    );
    const cashier = rows[0];
    if (!cashier || !cashier.is_active) {
      return NextResponse.json({ error: "Cashier not found or inactive" }, { status: 404 });
    }
    const ok = await verifyPassword(b.pin, cashier.pin_hash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    const openShift = await findOpenShift(cashier.id);
    return NextResponse.json({
      cashier: { id: cashier.id, name: cashier.name },
      openShift,
    });
  } catch (err) {
    console.error("pos verify-pin error:", err);
    return NextResponse.json({ error: "Could not verify PIN" }, { status: 500 });
  }
}
