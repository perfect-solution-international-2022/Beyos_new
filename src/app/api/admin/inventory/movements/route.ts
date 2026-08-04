import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

function pdfEscape(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "?").replace(/([\\()])/g, "\\$1");
}

function buildPdf(lines: string[]) {
  const perPage = 48;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / perPage)) }, (_, index) =>
    lines.slice(index * perPage, (index + 1) * perPage)
  );
  const fontId = 3 + pages.length * 2;
  const pageIds = pages.map((_, index) => 3 + index * 2);
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const content = `BT\n/F1 8 Tf\n36 806 Td\n10 TL\n${pageLines.map((line, lineIndex) => `${lineIndex ? "T*\n" : ""}(${pdfEscape(line)}) Tj`).join("\n")}\nET`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
  });
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= fontId; id += 1) {
    offsets[id] = Buffer.byteLength(output);
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id += 1) output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}

export async function GET(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const search = params.get("search")?.trim() || "";
  const direction = params.get("direction") || "all";
  const type = params.get("type") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const conditions: string[] = [];
  const values: unknown[] = [];
  // A variation update is followed by a parent-product total refresh. Older
  // triggers recorded both; hide that aggregate row so one action is one entry.
  conditions.push(`NOT (sm.variant_id IS NULL AND EXISTS (
    SELECT 1 FROM stock_movements child
    WHERE child.product_id = sm.product_id AND child.variant_id IS NOT NULL
      AND child.movement_type = sm.movement_type
      AND child.created_by <=> sm.created_by AND child.note <=> sm.note
      AND ABS(TIMESTAMPDIFF(SECOND, child.created_at, sm.created_at)) <= 1
  ))`);
  if (search) {
    conditions.push("(sm.product_name LIKE ? OR sm.sku LIKE ? OR sm.reference_id LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (direction === "in") conditions.push("sm.quantity_change > 0");
  if (direction === "out") conditions.push("sm.quantity_change < 0");
  if (type !== "all") { conditions.push("sm.movement_type = ?"); values.push(type); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { conditions.push("sm.created_at >= ?"); values.push(`${from} 00:00:00`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { conditions.push("sm.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); values.push(`${to} 00:00:00`); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const rows = await query<any>(
      `SELECT sm.*, u.name AS created_by_name FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.created_by ${where}
       ORDER BY sm.created_at DESC, sm.id DESC LIMIT 500`, values
    );
    const movements = rows.map((row: any) => ({
      id: Number(row.id), productName: row.product_name, sku: row.sku, variantId: row.variant_id,
      movementType: row.movement_type, before: Number(row.quantity_before), change: Number(row.quantity_change),
      after: Number(row.quantity_after), referenceType: row.reference_type, referenceId: row.reference_id,
      note: row.note, createdBy: row.created_by_name, createdAt: row.created_at,
    }));
    if (params.get("format") === "pdf") {
      const heading = [
        "BEYOS - STOCK MOVEMENT HISTORY",
        `Period: ${from || "All"} to ${to || "All"}    Direction: ${direction}    Type: ${type}`,
        `Generated: ${new Date().toISOString()}`,
        "",
        "DATE              SKU          PRODUCT                    TYPE          BEFORE  CHANGE  AFTER  REASON",
        "-----------------------------------------------------------------------------------------------",
      ];
      const lines = movements.map((movement: any) => {
        const date = new Date(movement.createdAt).toISOString().slice(0, 16).replace("T", " ");
        const clip = (value: unknown, size: number) => String(value ?? "").slice(0, size).padEnd(size);
        return `${date}  ${clip(movement.sku, 12)} ${clip(movement.productName, 26)} ${clip(movement.movementType, 13)} ${String(movement.before).padStart(6)} ${String(movement.change).padStart(7)} ${String(movement.after).padStart(6)}  ${String(movement.note || "").slice(0, 35)}`;
      });
      return new Response(buildPdf([...heading, ...lines]), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="stock-movements-${from || "all"}-${to || "all"}.pdf"` },
      });
    }
    return NextResponse.json({ movements });
  } catch (error) {
    console.error("stock movements GET error:", error);
    return NextResponse.json({ error: "Could not load stock movements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { productId?: number; variantId?: number | null; stock?: number; quantity?: number; direction?: "in" | "out"; reason?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const productId = Number(body.productId);
  const variantId = body.variantId ? Number(body.variantId) : null;
  const stock = Number(body.stock);
  const quantity = Number(body.quantity);
  const direction = body.direction;
  const isMovement = direction === "in" || direction === "out";
  const suppliedReason = body.reason?.trim() || "";
  const reason = suppliedReason || "Manual inventory adjustment";
  if (!Number.isInteger(productId) || productId < 1 || (isMovement && !suppliedReason) || reason.length > 255 ||
      (isMovement ? (!Number.isInteger(quantity) || quantity < 1) : (!Number.isInteger(stock) || stock < 0))) {
    return NextResponse.json({ error: "Enter a valid stock quantity and reason" }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET @stock_movement_type = ?, @stock_note = ?, @stock_created_by = ?", [isMovement ? `stock_${direction}` : "adjustment", reason, admin.id]);
    if (variantId) {
      const [locked] = await conn.execute("SELECT stock FROM product_variants WHERE id = ? AND product_id = ? FOR UPDATE", [variantId, productId]);
      const current = (locked as { stock: number }[])[0];
      if (!current) throw new Error("Variation not found");
      const nextStock = isMovement ? Number(current.stock) + (direction === "in" ? quantity : -quantity) : stock;
      if (nextStock < 0) throw new Error("Stock out quantity cannot exceed the available stock");
      await conn.execute("UPDATE product_variants SET stock = ? WHERE id = ? AND product_id = ?", [nextStock, variantId, productId]);
      const [rows] = await conn.execute("SELECT COALESCE(SUM(stock), 0) AS total FROM product_variants WHERE product_id = ?", [productId]);
      const total = Number((rows as { total: number }[])[0].total);
      await conn.query("SET @skip_stock_movement = 1");
      await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [total, productId]);
      await conn.query("SET @skip_stock_movement = NULL");
      await conn.commit();
      return NextResponse.json({ ok: true, productStock: total });
    }
    const [locked] = await conn.execute("SELECT stock FROM products WHERE id = ? FOR UPDATE", [productId]);
    const current = (locked as { stock: number }[])[0];
    if (!current) throw new Error("Product not found");
    const nextStock = isMovement ? Number(current.stock) + (direction === "in" ? quantity : -quantity) : stock;
    if (nextStock < 0) throw new Error("Stock out quantity cannot exceed the available stock");
    await conn.execute("UPDATE products SET stock = ? WHERE id = ?", [nextStock, productId]);
    await conn.commit();
    return NextResponse.json({ ok: true, productStock: nextStock });
  } catch (error) {
    await conn.rollback().catch(() => {});
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not adjust stock" }, { status: 400 });
  } finally {
    await conn.query("SET @stock_movement_type = NULL, @stock_note = NULL, @stock_created_by = NULL, @skip_stock_movement = NULL").catch(() => {});
    conn.release();
  }
}
