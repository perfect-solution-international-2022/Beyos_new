import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

export async function GET(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const search = params.get("search")?.trim() || "";
  const direction = params.get("direction") || "all";
  const type = params.get("type") || "all";
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (search) {
    conditions.push("(sm.product_name LIKE ? OR sm.sku LIKE ? OR sm.reference_id LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (direction === "in") conditions.push("sm.quantity_change > 0");
  if (direction === "out") conditions.push("sm.quantity_change < 0");
  if (type !== "all") { conditions.push("sm.movement_type = ?"); values.push(type); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const rows = await query<any>(
      `SELECT sm.*, u.name AS created_by_name FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by ${where}
       ORDER BY sm.created_at DESC, sm.id DESC LIMIT 500`, values
    );
    return NextResponse.json({ movements: rows.map((row: any) => ({
      id: Number(row.id), productName: row.product_name, sku: row.sku, variantId: row.variant_id,
      movementType: row.movement_type, before: Number(row.quantity_before), change: Number(row.quantity_change),
      after: Number(row.quantity_after), referenceType: row.reference_type, referenceId: row.reference_id,
      note: row.note, createdBy: row.created_by_name, createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error("stock movements GET error:", error);
    return NextResponse.json({ error: "Could not load stock movements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { productId?: number; variantId?: number | null; stock?: number; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const productId = Number(body.productId);
  const variantId = body.variantId ? Number(body.variantId) : null;
  const stock = Number(body.stock);
  const reason = body.reason?.trim() || "Manual inventory adjustment";
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(stock) || stock < 0 || reason.length > 255) {
    return NextResponse.json({ error: "Enter a valid stock quantity and reason" }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET @stock_movement_type = 'adjustment', @stock_note = ?, @stock_created_by = ?", [reason, admin.id]);
    if (variantId) {
      const [result] = await conn.execute("UPDATE product_variants SET stock = ? WHERE id = ? AND product_id = ?", [stock, variantId, productId]);
      if (!(result as { affectedRows: number }).affectedRows) throw new Error("Variation not found");
      const [rows] = await conn.execute("SELECT COALESCE(SUM(stock), 0) AS total FROM product_variants WHERE product_id = ?", [productId]);
      const total = Number((rows as { total: number }[])[0].total);
      await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [total, productId]);
      await conn.commit();
      return NextResponse.json({ ok: true, productStock: total });
    }
    const [result] = await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [stock, productId]);
    if (!(result as { affectedRows: number }).affectedRows) throw new Error("Product not found");
    await conn.commit();
    return NextResponse.json({ ok: true, productStock: stock });
  } catch (error) {
    await conn.rollback().catch(() => {});
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not adjust stock" }, { status: 400 });
  } finally {
    await conn.query("SET @stock_movement_type = NULL, @stock_note = NULL, @stock_created_by = NULL").catch(() => {});
    conn.release();
  }
}
