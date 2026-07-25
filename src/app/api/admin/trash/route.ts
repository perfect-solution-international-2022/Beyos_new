import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [users, products, orders, resellerOrders, posSales] = await Promise.all([
      query<any>("SELECT id, name, email, deleted_at FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
      query<any>("SELECT id, name, sku, deleted_at FROM products WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
      query<any>("SELECT id, order_ref, customer_name, deleted_at FROM orders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
      query<any>("SELECT id, order_ref, customer_name, deleted_at FROM reseller_orders WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
      query<any>("SELECT id, receipt_number, customer_name, deleted_at FROM pos_sales WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC"),
    ]);
    return NextResponse.json({ items: [
      ...users.map((item: any) => ({ type: "user", id: item.id, reference: item.email, name: item.name, deletedAt: item.deleted_at })),
      ...products.map((item: any) => ({ type: "product", id: item.id, reference: item.sku, name: item.name, deletedAt: item.deleted_at })),
      ...orders.map((item: any) => ({ type: "customer_order", id: item.id, reference: item.order_ref, name: item.customer_name, deletedAt: item.deleted_at })),
      ...resellerOrders.map((item: any) => ({ type: "reseller_order", id: item.id, reference: item.order_ref, name: item.customer_name, deletedAt: item.deleted_at })),
      ...posSales.map((item: any) => ({ type: "pos_order", id: item.id, reference: item.receipt_number, name: item.customer_name || "Walk-in Customer", deletedAt: item.deleted_at })),
    ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()) });
  } catch (error) {
    console.error("trash GET error:", error);
    return NextResponse.json({ error: "Could not load trash" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { type?: string; id?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  const statements: Record<string, string> = {
    user: "UPDATE users SET deleted_at = NULL, account_status = 'active', session_version = session_version + 1 WHERE id = ? AND deleted_at IS NOT NULL",
    product: "UPDATE products SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
    customer_order: "UPDATE orders SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
    reseller_order: "UPDATE reseller_orders SET deleted_at = NULL, status = 'cancelled' WHERE id = ? AND deleted_at IS NOT NULL",
    pos_order: "UPDATE pos_sales SET deleted_at = NULL, delivery_status = 'cancelled' WHERE id = ? AND deleted_at IS NOT NULL",
  };
  const sql = statements[body.type || ""];
  if (!sql) return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
  try {
    await query(sql, [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("trash restore error:", error);
    return NextResponse.json({ error: "Could not restore item" }, { status: 500 });
  }
}
