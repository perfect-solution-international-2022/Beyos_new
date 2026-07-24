import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

// Focused endpoint for the Inventory page: update one variant's stock
// without touching any of its other fields, then keep the parent product's
// aggregate stock (products.stock) in sync with the sum of its variants.
export async function PATCH(request: Request) {
  const admin = await requireAdminSection("catalog");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const variantId = Number(b.variantId);
  const stock = Number(b.stock);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return NextResponse.json({ error: "Invalid variant" }, { status: 400 });
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return NextResponse.json({ error: "Invalid stock quantity" }, { status: 400 });
  }

  try {
    const rows = await query<{ product_id: number }>(
      "SELECT product_id FROM product_variants WHERE id = ? LIMIT 1",
      [variantId]
    );
    if (!rows[0]) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    const productId = rows[0].product_id;

    await query("UPDATE product_variants SET stock = ? WHERE id = ?", [stock, variantId]);
    const [{ total }] = await query<{ total: number }>(
      "SELECT COALESCE(SUM(stock), 0) AS total FROM product_variants WHERE product_id = ?",
      [productId]
    );
    await query("UPDATE products SET stock = ? WHERE id = ?", [total, productId]);

    revalidatePath("/");
    revalidatePath("/shop");
    return NextResponse.json({ ok: true, productStock: total });
  } catch (err) {
    console.error("admin variant stock PATCH error:", err);
    return NextResponse.json({ error: "Could not update stock" }, { status: 500 });
  }
}
