import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";
import { mapKoombiyoStatus, requestWaybill, submitOrder, trackOrder } from "@/lib/koombiyo";
import { sendOrderStatusSms } from "@/lib/sms";

interface OrderRow {
  order_ref: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  city: string;
  total: string;
  payment_status: string;
  koombiyo_waybill_id: string | null;
  status: string;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { orderRef?: string; action?: "dispatch" | "track"; specialNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.orderRef || !["dispatch", "track"].includes(body.action || "")) {
    return NextResponse.json({ error: "Order reference and action are required" }, { status: 400 });
  }

  try {
    const rows = await query<OrderRow>(
      `SELECT order_ref, customer_name, customer_phone, address, city, total,
              payment_status, koombiyo_waybill_id, status
       FROM orders WHERE order_ref = ? LIMIT 1`,
      [body.orderRef]
    );
    if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const order = rows[0];

    if (body.action === "dispatch") {
      const waybillId = order.koombiyo_waybill_id || (await requestWaybill());
      const response = await submitOrder({
        waybillId,
        orderRef: order.order_ref,
        receiverName: order.customer_name,
        receiverStreet: `${order.address}${order.city ? `, ${order.city}` : ""}`,
        receiverPhone: order.customer_phone,
        codAmount: order.payment_status === "paid" ? 0 : Number(order.total),
        specialNote: body.specialNote,
      });
      await query(
        `UPDATE orders SET koombiyo_waybill_id = ?, koombiyo_status = 'Booked',
         koombiyo_response = ?, koombiyo_updated_at = NOW(), status = 'confirmed'
         WHERE order_ref = ?`,
        [waybillId, JSON.stringify(response), order.order_ref]
      );
      if (order.status !== "confirmed") {
        await sendOrderStatusSms(order.customer_phone, order.order_ref, "confirmed");
      }
      return NextResponse.json({ ok: true, waybillId, courierStatus: "Booked", status: "confirmed" });
    }

    if (!order.koombiyo_waybill_id) {
      return NextResponse.json({ error: "Send this order to Koombiyo before tracking it" }, { status: 400 });
    }
    const tracking = await trackOrder(order.koombiyo_waybill_id);
    const status = mapKoombiyoStatus(tracking.status);
    await query(
      `UPDATE orders SET koombiyo_status = ?, koombiyo_response = ?, koombiyo_updated_at = NOW(),
       status = ?, payment_status = IF(? = 'delivered', 'paid', payment_status),
       paid_at = IF(? = 'delivered', COALESCE(paid_at, NOW()), paid_at)
       WHERE order_ref = ?`,
      [tracking.status, JSON.stringify(tracking.raw), status, status, status, order.order_ref]
    );
    if (order.status !== status) {
      await sendOrderStatusSms(order.customer_phone, order.order_ref, status);
    }
    return NextResponse.json({
      ok: true,
      waybillId: tracking.waybillId,
      courierStatus: tracking.status,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Koombiyo order action failed:", error);
    const message = error instanceof Error ? error.message : "Koombiyo request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
