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
  customer_phone_2: string | null;
  address: string;
  city: string;
  total: string;
  payment_status: string;
  koombiyo_waybill_id: string | null;
  koombiyo_status: string | null;
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
          `SELECT order_ref, customer_name, customer_phone, customer_phone_2, customer_email, customer_address AS address, city,
                  amount AS total, payment_status, koombiyo_waybill_id, koombiyo_status, status, district_id, city_id,
                  reseller_id, profit, inventory_reverted_at
           FROM reseller_orders WHERE order_ref = ? AND deleted_at IS NULL LIMIT 1`, [body.orderRef])
      : await query<OrderRow>(
          `SELECT order_ref, customer_name, customer_phone, customer_phone_2, customer_email, address, city, total,
                  payment_status, koombiyo_waybill_id, koombiyo_status, status
           FROM orders WHERE order_ref = ? AND deleted_at IS NULL LIMIT 1`, [body.orderRef]);
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
      if (order.status !== "confirmed") {
        return NextResponse.json({ error: "Accept this order before requesting a waybill" }, { status: 409 });
      }
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
      if (order.status !== "confirmed") {
        return NextResponse.json({ error: "Accept this order before submitting it to the courier" }, { status: 409 });
      }
      if (!order.koombiyo_waybill_id) {
        return NextResponse.json({ error: "Request a waybill ID before placing the order" }, { status: 400 });
      }
      if (order.koombiyo_status) {
        return NextResponse.json({ error: "This order has already been submitted to the courier" }, { status: 409 });
      }
      const orderItems = await query<{ name: string; variation: string; sku: string }>(
        isReseller
          ? `SELECT oi.name, COALESCE(oi.variant_summary, '') AS variation, COALESCE(oi.sku, p.sku, '') AS sku
             FROM reseller_order_items oi LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = (SELECT id FROM reseller_orders WHERE order_ref = ? AND deleted_at IS NULL LIMIT 1)`
          : `SELECT oi.name, TRIM(CONCAT_WS(' / ', NULLIF(oi.size, ''), NULLIF(oi.color, ''))) AS variation,
                    COALESCE(pv.sku, p.sku, '') AS sku
             FROM order_items oi LEFT JOIN product_variants pv ON pv.id = oi.variant_id
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = (SELECT id FROM orders WHERE order_ref = ? AND deleted_at IS NULL LIMIT 1)`,
        [order.order_ref]
      );
      const description = orderItems.map((item) =>
        [item.name, item.variation && `Variation: ${item.variation}`, `SKU: ${item.sku || "—"}`].filter(Boolean).join(" | ")
      ).join("; ");
      const response = await submitOrder({
        waybillId: order.koombiyo_waybill_id,
        orderRef: order.order_ref,
        receiverName: order.customer_name,
        receiverStreet: `${order.address}${order.city ? `, ${order.city}` : ""}`,
        receiverPhone: order.customer_phone,
        codAmount: order.payment_status === "paid" ? 0 : Number(order.total),
        description,
        specialNote: [order.customer_phone_2 ? `2nd phone: ${order.customer_phone_2}` : "", body.specialNote || ""].filter(Boolean).join(" | "),
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
    if (["cancelled", "returned"].includes(status) && !order.inventory_reverted_at) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const orderTable = isReseller ? "reseller_orders" : "orders";
        const itemTable = isReseller ? "reseller_order_items" : "order_items";
        const [locked] = await conn.execute(`SELECT id, inventory_reverted_at FROM ${orderTable} WHERE order_ref = ? AND deleted_at IS NULL FOR UPDATE`, [order.order_ref]);
        const current = (locked as { id: number; inventory_reverted_at: string | null }[])[0];
        if (current && !current.inventory_reverted_at) {
          const [items] = await conn.execute(`SELECT product_id, product_slug, variant_id, quantity FROM ${itemTable} WHERE order_id = ?`, [current.id]);
          for (const item of items as { product_id: number | null; product_slug: string; variant_id: number | null; quantity: number }[]) {
            if (item.variant_id) await conn.execute("UPDATE product_variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variant_id]);
            if (item.product_id && (!isReseller || !item.variant_id)) await conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
            else await conn.execute("UPDATE products SET stock = stock + ? WHERE slug = ?", [item.quantity, item.product_slug]);
          }
          await conn.execute(`UPDATE ${orderTable} SET inventory_reverted_at = NOW() WHERE id = ?`, [current.id]);
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
