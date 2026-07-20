import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireReseller, makeRef } from "@/lib/reseller";
import type { PoolConnection } from "mysql2/promise";
import { sendOrderConfirmationSms } from "@/lib/sms";

interface OrderRow {
  id: number;
  order_ref: string;
  customer_name: string;
  customer_phone: string;
  amount: string;
  profit: string;
  status: string;
  reject_reason: string | null;
  payment_status: string;
  created_at: string;
}

export async function GET(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const conditions = ["reseller_id = ?"];
    const params: unknown[] = [reseller.id];
    if (status && status !== "all") {
      conditions.push("status = ?");
      params.push(status);
    }
    const orders = await query<OrderRow>(
      `SELECT id, order_ref, customer_name, customer_phone, amount, profit,
              status, reject_reason, payment_status, created_at
       FROM reseller_orders WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      params
    );

    let itemsByOrder = new Map<number, number>();
    if (orders.length) {
      const ids = orders.map((o) => o.id);
      const ph = ids.map(() => "?").join(",");
      const counts = await query<{ order_id: number; qty: number }>(
        `SELECT order_id, COALESCE(SUM(quantity),0) AS qty
         FROM reseller_order_items WHERE order_id IN (${ph}) GROUP BY order_id`,
        ids
      );
      itemsByOrder = new Map(counts.map((c) => [c.order_id, Number(c.qty)]));
    }

    return NextResponse.json({
      orders: orders.map((o) => ({
        orderRef: o.order_ref,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        amount: Number(o.amount),
        profit: Number(o.profit),
        status: o.status,
        rejectReason: o.reject_reason,
        paymentStatus: o.payment_status,
        quantity: itemsByOrder.get(o.id) ?? 0,
        createdAt: o.created_at,
      })),
    });
  } catch (err) {
    console.error("reseller orders GET error:", err);
    return NextResponse.json({ error: "Order service did not return a response" }, { status: 500 });
  }
}

interface NewOrderItem {
  slug: string;
  quantity: number;
  sellingPrice: number;
}

export async function POST(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    customer?: { name?: string; phone?: string; address?: string };
    items?: NewOrderItem[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const customer = body.customer ?? {};
  const items = body.items ?? [];
  if (!customer.name?.trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Add at least one product" }, { status: 400 });
  }

  // Recompute cost from the DB reseller price (source of truth).
  const lineItems = [];
  let amount = 0;
  let cost = 0;
  for (const it of items) {
    const rows = await query<{
      slug: string;
      sku: string;
      name: string;
      reseller_price: string | null;
      price: string;
    }>(
      "SELECT slug, sku, name, reseller_price, price FROM products WHERE slug = ? LIMIT 1",
      [it.slug]
    );
    const p = rows[0];
    if (!p) {
      return NextResponse.json({ error: `Unknown product: ${it.slug}` }, { status: 400 });
    }
    const qty = Math.max(1, Number(it.quantity) || 1);
    const resellerPrice = p.reseller_price ? Number(p.reseller_price) : Number(p.price);
    const sellingPrice = Math.max(resellerPrice, Number(it.sellingPrice) || resellerPrice);
    const lineTotal = sellingPrice * qty;
    amount += lineTotal;
    cost += resellerPrice * qty;
    lineItems.push({
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      quantity: qty,
      resellerPrice,
      sellingPrice,
      lineTotal,
    });
  }
  const profit = amount - cost;
  const orderRef = makeRef("ORD");

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [res] = await conn.execute(
      `INSERT INTO reseller_orders
        (order_ref, reseller_id, customer_name, customer_phone, customer_address,
         amount, cost, profit, status, payment_status)
       VALUES (?,?,?,?,?,?,?,?,'pending','unpaid')`,
      [
        orderRef,
        reseller.id,
        customer.name.trim(),
        customer.phone?.trim() || "",
        customer.address?.trim() || "",
        amount,
        cost,
        profit,
      ]
    );
    const orderId = (res as { insertId: number }).insertId;
    for (const li of lineItems) {
      await conn.execute(
        `INSERT INTO reseller_order_items
          (order_id, product_slug, sku, name, quantity, reseller_price, selling_price, line_total)
         VALUES (?,?,?,?,?,?,?,?)`,
        [orderId, li.slug, li.sku, li.name, li.quantity, li.resellerPrice, li.sellingPrice, li.lineTotal]
      );
    }
    await conn.commit();
    const resellerPhone = await query<{ phone: string }>(
      "SELECT phone FROM users WHERE id = ? LIMIT 1",
      [reseller.id]
    );
    await sendOrderConfirmationSms({
      phone: resellerPhone[0]?.phone,
      orderRef,
      total: amount,
      status: "pending",
    });
    return NextResponse.json({
      success: true,
      order: { orderRef, amount, profit, status: "pending" },
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("reseller order POST error:", err);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
