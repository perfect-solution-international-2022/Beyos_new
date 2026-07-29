import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { verifyAndApplyOnepayPayment } from "@/lib/onepay-payment";

export async function POST(_request: Request, { params }: { params: Promise<{ ref: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { ref } = await params;
  const rows = await query<{ payment_ref: string | null; payment_method: string }>(
    "SELECT payment_ref, payment_method FROM orders WHERE order_ref = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1",
    [ref, user.id]
  );
  const order = rows[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.payment_method !== "onepay" || !order.payment_ref) return NextResponse.json({ paid: false });
  try {
    const result = await verifyAndApplyOnepayPayment(order.payment_ref, ref);
    return NextResponse.json({ paid: result.paid });
  } catch (error) {
    console.error("OnePay return verification failed");
    return NextResponse.json({ paid: false });
  }
}
