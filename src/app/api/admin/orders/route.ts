import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const CUSTOMER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const RESELLER_STATUSES = ["pending", "completed", "rejected"];
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const buyer = await query<{
      order_ref: string;
      customer_name: string;
      total: string;
      status: string;
      payment_method: string;
      payment_status: string;
      payment_ref: string | null;
      created_at: string;
    }>(
      `SELECT order_ref, customer_name, total, status, payment_method, payment_status, payment_ref, created_at
       FROM orders ORDER BY created_at DESC`
    );
    const reseller = await query<{
      order_ref: string;
      customer_name: string;
      amount: string;
      status: string;
      payment_status: string;
      created_at: string;
    }>(
      `SELECT order_ref, customer_name, amount, status, payment_status, created_at FROM reseller_orders ORDER BY created_at DESC`
    );

    const orders = [
      ...buyer.map((o) => ({
        type: "customer" as const,
        orderRef: o.order_ref,
        customerName: o.customer_name,
        amount: Number(o.total),
        status: o.status,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        paymentRef: o.payment_ref,
        createdAt: o.created_at,
      })),
      ...reseller.map((o) => ({
        type: "reseller" as const,
        orderRef: o.order_ref,
        customerName: o.customer_name,
        amount: Number(o.amount),
        status: o.status,
        paymentMethod: "reseller",
        paymentStatus: o.payment_status,
        paymentRef: null as string | null,
        createdAt: o.created_at,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("admin orders GET error:", err);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { type?: string; orderRef?: string; status?: string; paymentStatus?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { type, orderRef, status, paymentStatus } = body;
  if (!orderRef || (!status && !paymentStatus)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const table = type === "reseller" ? "reseller_orders" : "orders";
  const sets: string[] = [];
  const params: unknown[] = [];

  if (status) {
    const allowed = type === "reseller" ? RESELLER_STATUSES : CUSTOMER_STATUSES;
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    sets.push("status = ?");
    params.push(status);
    // Fulfilling an order implies it's been paid for.
    if (status === "delivered" || status === "completed") {
      sets.push("payment_status = 'paid'");
      if (table === "orders") sets.push("paid_at = COALESCE(paid_at, NOW())");
    }
  }

  if (paymentStatus) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    sets.push("payment_status = ?");
    params.push(paymentStatus);
    if (table === "orders" && paymentStatus === "paid") {
      sets.push("paid_at = COALESCE(paid_at, NOW())");
    }
  }

  try {
    params.push(orderRef);
    await query(`UPDATE ${table} SET ${sets.join(", ")} WHERE order_ref = ?`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin orders PATCH error:", err);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }
}
