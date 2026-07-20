import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface OrderRow {
  id: number;
  order_ref: string;
  subtotal: string;
  shipping: string;
  total: string;
  status: string;
  created_at: string;
}

interface ItemRow {
  order_id: number;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const orders = await query<OrderRow>(
      `SELECT id, order_ref, subtotal, shipping, total, status, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id]
    );

    if (orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    const ids = orders.map((o) => o.id);
    const placeholders = ids.map(() => "?").join(",");
    const items = await query<ItemRow>(
      `SELECT order_id, name, size, color, quantity, unit_price, line_total
       FROM order_items WHERE order_id IN (${placeholders})`,
      ids
    );

    const byOrder = new Map<number, ItemRow[]>();
    for (const it of items) {
      const list = byOrder.get(it.order_id) ?? [];
      list.push(it);
      byOrder.set(it.order_id, list);
    }

    const result = orders.map((o) => ({
      orderRef: o.order_ref,
      status: o.status,
      createdAt: o.created_at,
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      total: Number(o.total),
      items: (byOrder.get(o.id) ?? []).map((it) => ({
        name: it.name,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      })),
    }));

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error("orders fetch error:", err);
    return NextResponse.json(
      { error: "Could not load orders" },
      { status: 500 }
    );
  }
}
