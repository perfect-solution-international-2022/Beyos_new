import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendOrderStatusSms } from "@/lib/sms";

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
      customer_phone: string;
      koombiyo_waybill_id: string | null;
      koombiyo_status: string | null;
      koombiyo_updated_at: string | null;
      created_at: string;
    }>(
      `SELECT order_ref, customer_name, customer_phone, total, status, payment_method, payment_status,
              payment_ref, koombiyo_waybill_id, koombiyo_status, koombiyo_updated_at, created_at
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
    const pos = await query<{
      receipt_number: string;
      customer_name: string | null;
      customer_phone: string | null;
      total: string;
      payment_method: string;
      status: string;
      fulfillment_type: string | null;
      delivery_status: string | null;
      cashier_name: string;
      created_at: string;
    }>(
      `SELECT s.receipt_number, s.customer_name, s.customer_phone, s.total,
              s.payment_method, s.status, s.fulfillment_type, s.delivery_status,
              c.name AS cashier_name, s.created_at
       FROM pos_sales s
       JOIN pos_cashiers c ON c.id = s.cashier_id
       ORDER BY s.created_at DESC`
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
        customerPhone: o.customer_phone,
        koombiyoWaybillId: o.koombiyo_waybill_id,
        koombiyoStatus: o.koombiyo_status,
        koombiyoUpdatedAt: o.koombiyo_updated_at,
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
        customerPhone: "",
        koombiyoWaybillId: null as string | null,
        koombiyoStatus: null as string | null,
        koombiyoUpdatedAt: null as string | null,
        createdAt: o.created_at,
      })),
      ...pos.map((o) => ({
        type: "pos" as const,
        orderRef: o.receipt_number,
        customerName: o.customer_name || "Walk-in Customer",
        amount: Number(o.total),
        status: o.fulfillment_type === "delivery" ? (o.delivery_status || "pending") : o.status,
        paymentMethod: `pos_${o.payment_method}`,
        paymentStatus: "paid",
        paymentRef: null as string | null,
        customerPhone: o.customer_phone || "",
        koombiyoWaybillId: null as string | null,
        koombiyoStatus: null as string | null,
        koombiyoUpdatedAt: null as string | null,
        fulfillmentType: o.fulfillment_type || "pickup",
        cashierName: o.cashier_name,
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
  if (type === "pos") {
    return NextResponse.json({ error: "Manage POS sales from the POS Sales page" }, { status: 400 });
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
    const recipient = type === "reseller"
      ? await query<{ phone: string; status: string }>(
          `SELECT u.phone, ro.status FROM reseller_orders ro
           JOIN users u ON u.id = ro.reseller_id WHERE ro.order_ref = ? LIMIT 1`,
          [orderRef]
        )
      : await query<{ phone: string; status: string }>(
          "SELECT customer_phone AS phone, status FROM orders WHERE order_ref = ? LIMIT 1",
          [orderRef]
        );
    params.push(orderRef);
    await query(`UPDATE ${table} SET ${sets.join(", ")} WHERE order_ref = ?`, params);
    if (status && recipient[0] && recipient[0].status !== status) {
      await sendOrderStatusSms(recipient[0].phone, orderRef, status);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin orders PATCH error:", err);
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }
}
