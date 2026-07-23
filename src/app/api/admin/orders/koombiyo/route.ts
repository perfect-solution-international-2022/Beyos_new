import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { pool, query } from "@/lib/db";
import { mapKoombiyoStatus, requestWaybill, submitOrder, trackOrder } from "@/lib/koombiyo";
import { sendOrderStatusSms } from "@/lib/sms";
import { sendOrderEmail } from "@/lib/mail";

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
  district_id?: number | null;
  city_id?: number | null;
  reseller_id?: number;
  profit?: string;
  inventory_reverted_at?: string | null;
  customer_email?: string | null;
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("sales");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { orderRef?: string; action?: "request-waybill" | "place-order" | "track"; specialNote?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.orderRef || !["request-waybill", "place-order", "track"].includes(body.action || "")) {
    return NextResponse.json({ error: "Order reference and action are required" }, { status: 400 });
  }

  try {
    const isReseller = body.type === "reseller";
    const rows = isReseller
      ? await query<OrderRow>(
          `SELECT order_ref, customer_name, customer_phone, customer_email, customer_address AS address, city,
                  amount AS total, payment_status, koombiyo_waybill_id, status, district_id, city_id,
                  reseller_id, profit, inventory_reverted_at
           FROM reseller_orders WHERE order_ref = ? LIMIT 1`, [body.orderRef])
      : await query<OrderRow>(
          `SELECT order_ref, customer_name, customer_phone, customer_email, address, city, total,
                  payment_status, koombiyo_waybill_id, status
           FROM orders WHERE order_ref = ? LIMIT 1`, [body.orderRef]);
    if (!rows.length) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const order = rows[0];
    const notify = async (nextStatus: string) => {
      const tasks: Promise<unknown>[] = [sendOrderStatusSms(order.customer_phone, order.order_ref, nextStatus)];
      if (order.customer_email) tasks.push(sendOrderEmail(order.customer_email, { orderRef: order.order_ref, total: Number(order.total), status: nextStatus }));
      if (isReseller && order.reseller_id) {
        const owners = await query<{ phone: string; email: string }>("SELECT phone, email FROM users WHERE id = ? LIMIT 1", [order.reseller_id]);
        if (owners[0]?.phone) tasks.push(sendOrderStatusSms(owners[0].phone, order.order_ref, nextStatus));
        if (owners[0]?.email) tasks.push(sendOrderEmail(owners[0].email, { orderRef: order.order_ref, total: Number(order.total), status: nextStatus }));
      }
      await Promise.allSettled(tasks);
    };

    if (body.action === "request-waybill") {
      const waybillId = order.koombiyo_waybill_id || (await requestWaybill());
      if (!order.koombiyo_waybill_id) {
        await query(
          `UPDATE ${isReseller ? "reseller_orders" : "orders"} SET koombiyo_waybill_id = ? WHERE order_ref = ?`,
          [waybillId, order.order_ref]
        );
      }
      return NextResponse.json({ ok: true, waybillId });
    }

    if (body.action === "place-order") {
      if (!order.koombiyo_waybill_id) {
        return NextResponse.json({ error: "Request a waybill ID before placing the order" }, { status: 400 });
      }
      const response = await submitOrder({
        waybillId: order.koombiyo_waybill_id,
        orderRef: order.order_ref,
        receiverName: order.customer_name,
        receiverStreet: `${order.address}${order.city ? `, ${order.city}` : ""}`,
        receiverPhone: order.customer_phone,
        codAmount: order.payment_status === "paid" ? 0 : Number(order.total),
        specialNote: body.specialNote,
        districtId: order.district_id ?? undefined,
        cityId: order.city_id ?? undefined,
      });
      await query(
        `UPDATE ${isReseller ? "reseller_orders" : "orders"} SET koombiyo_status = 'Booked',
         koombiyo_response = ?, koombiyo_updated_at = NOW(), status = 'confirmed'
         WHERE order_ref = ?`,
        [JSON.stringify(response), order.order_ref]
      );
      if (order.status !== "confirmed") {
        await notify("confirmed");
      }
      return NextResponse.json({ ok: true, waybillId: order.koombiyo_waybill_id, courierStatus: "Booked", status: "confirmed" });
    }

    if (!order.koombiyo_waybill_id) {
      return NextResponse.json({ error: "Send this order to Koombiyo before tracking it" }, { status: 400 });
    }
    const tracking = await trackOrder(order.koombiyo_waybill_id);
    const status = mapKoombiyoStatus(tracking.status);
    await query(
      `UPDATE ${isReseller ? "reseller_orders" : "orders"} SET koombiyo_status = ?, koombiyo_response = ?, koombiyo_updated_at = NOW(),
       status = ?, payment_status = IF(? = 'delivered', 'paid', payment_status),
       ${isReseller ? "wallet_credited_at = IF(? = 'delivered', COALESCE(wallet_credited_at, NOW()), wallet_credited_at)" : "paid_at = IF(? = 'delivered', COALESCE(paid_at, NOW()), paid_at)"}
       WHERE order_ref = ?`,
      [tracking.status, JSON.stringify(tracking.raw), status, status, status, order.order_ref]
    );
    if (isReseller && status === "delivered" && order.reseller_id) {
      await query(
        `INSERT IGNORE INTO reseller_wallet_transactions
         (reseller_id, type, amount, reference_type, reference_id, description)
         VALUES (?,'credit',?,'order',?,'Reseller order profit')`,
        [order.reseller_id, Number(order.profit || 0), order.order_ref]
      );
    }
    if (isReseller && status === "cancelled" && !order.inventory_reverted_at) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [locked] = await conn.execute("SELECT id, inventory_reverted_at FROM reseller_orders WHERE order_ref = ? FOR UPDATE", [order.order_ref]);
        const current = (locked as { id: number; inventory_reverted_at: string | null }[])[0];
        if (current && !current.inventory_reverted_at) {
          const [items] = await conn.execute("SELECT product_id, product_slug, variant_id, quantity FROM reseller_order_items WHERE order_id = ?", [current.id]);
          for (const item of items as { product_id: number | null; product_slug: string; variant_id: number | null; quantity: number }[]) {
            if (item.variant_id) await conn.execute("UPDATE product_variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variant_id]);
            else if (item.product_id) await conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
            else await conn.execute("UPDATE products SET stock = stock + ? WHERE slug = ?", [item.quantity, item.product_slug]);
          }
          await conn.execute("UPDATE reseller_orders SET inventory_reverted_at = NOW() WHERE id = ?", [current.id]);
        }
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
    }
    if (order.status !== status) {
      await notify(status);
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
