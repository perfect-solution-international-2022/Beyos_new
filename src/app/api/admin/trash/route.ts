import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireSuperAdmin();
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
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { type?: string; id?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  const statements: Record<string, string> = {
    user: "UPDATE users SET deleted_at = NULL, account_status = 'active', session_version = session_version + 1 WHERE id = ? AND deleted_at IS NOT NULL",
    product: "UPDATE products SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL",
  };
  const orderType = ["customer_order", "reseller_order", "pos_order"].includes(body.type || "") ? body.type : null;
  const sql = statements[body.type || ""];
  if (!sql && !orderType) return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
  try {
    if (sql) {
      await query(sql, [id]);
      return NextResponse.json({ ok: true });
    }

    const config = orderType === "customer_order"
      ? { table: "orders", items: "order_items", itemKey: "order_id", parentMode: "always" as const }
      : orderType === "reseller_order"
        ? { table: "reseller_orders", items: "reseller_order_items", itemKey: "order_id", parentMode: "simple" as const }
        : { table: "pos_sales", items: "pos_sale_items", itemKey: "sale_id", parentMode: "always" as const };
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(`SELECT id, inventory_reverted_at FROM ${config.table} WHERE id = ? AND deleted_at IS NOT NULL LIMIT 1 FOR UPDATE`, [id]);
      const order = (rows as { id: number; inventory_reverted_at: string | null }[])[0];
      if (!order) throw new Error("Archived order not found");

      if (order.inventory_reverted_at) {
        const productIdColumn = orderType === "pos_order" ? "NULL AS product_id" : "product_id";
        const [itemRows] = await conn.execute(`SELECT ${productIdColumn}, product_slug, variant_id, quantity FROM ${config.items} WHERE ${config.itemKey} = ?`, [id]);
        for (const item of itemRows as { product_id: number | null; product_slug: string; variant_id: number | null; quantity: number }[]) {
          if (item.variant_id) {
            const [variants] = await conn.execute("SELECT id, product_id, stock FROM product_variants WHERE id = ? LIMIT 1 FOR UPDATE", [item.variant_id]);
            const variant = (variants as { id: number; product_id: number; stock: number }[])[0];
            if (!variant || Number(variant.stock) < item.quantity) throw new Error(`Not enough stock to restore this order (${item.product_slug})`);
            await conn.execute("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [item.quantity, item.variant_id]);
            if (config.parentMode === "always") {
              const [products] = await conn.execute("SELECT stock FROM products WHERE id = ? LIMIT 1 FOR UPDATE", [variant.product_id]);
              if (!(products as { stock: number }[])[0] || Number((products as { stock: number }[])[0].stock) < item.quantity) throw new Error(`Not enough stock to restore this order (${item.product_slug})`);
              await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, variant.product_id]);
            }
          } else {
            const selector = item.product_id ? "id = ?" : "slug = ?";
            const selectorValue = item.product_id || item.product_slug;
            const [products] = await conn.execute(`SELECT id, stock FROM products WHERE ${selector} LIMIT 1 FOR UPDATE`, [selectorValue]);
            const product = (products as { id: number; stock: number }[])[0];
            if (!product || Number(product.stock) < item.quantity) throw new Error(`Not enough stock to restore this order (${item.product_slug})`);
            await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, product.id]);
          }
        }
      }
      await conn.execute(`UPDATE ${config.table} SET deleted_at = NULL, inventory_reverted_at = NULL WHERE id = ?`, [id]);
      await conn.commit();
    } catch (error) {
      await conn.rollback().catch(() => {});
      throw error;
    } finally {
      conn.release();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("trash restore error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not restore item" }, { status: 400 });
  }
}
