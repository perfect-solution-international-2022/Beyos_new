import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rows = await query<{
    order_ref: string;
    status: string;
    payment_method: string;
    payment_status: string;
    total: string;
    created_at: string;
  }>(
    `SELECT order_ref, status, payment_method, payment_status, total, created_at
     FROM orders WHERE order_ref = ? AND user_id = ? LIMIT 1`,
    [ref, user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const o = rows[0];
  return NextResponse.json({
    order: {
      orderRef: o.order_ref,
      status: o.status,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      total: Number(o.total),
      createdAt: o.created_at,
    },
  });
}
