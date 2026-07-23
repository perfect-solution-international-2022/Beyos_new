import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const num = (v: unknown) => (v === "" || v === undefined || v === null ? null : Number(v));

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<any>(
      `SELECT p.id, p.code, p.description, p.discount_type, p.discount_value, p.min_order_amount,
              p.max_discount_amount, p.start_date, p.end_date, p.usage_limit, p.usage_limit_per_user,
              p.is_active, p.created_at, (p.image_data IS NOT NULL) AS has_image,
              (SELECT COUNT(*) FROM promotion_usages u WHERE u.promotion_id = p.id) AS used_count
       FROM promotions p ORDER BY p.created_at DESC`
    );
    return NextResponse.json({
      promotions: rows.map((r) => ({
        id: r.id,
        code: r.code,
        description: r.description ?? "",
        discountType: r.discount_type,
        discountValue: Number(r.discount_value),
        minOrderAmount: r.min_order_amount ? Number(r.min_order_amount) : null,
        maxDiscountAmount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
        startDate: r.start_date,
        endDate: r.end_date,
        usageLimit: r.usage_limit,
        usageLimitPerUser: r.usage_limit_per_user,
        isActive: !!r.is_active,
        usedCount: Number(r.used_count),
        imageUrl: r.has_image ? `/api/promotions/${r.id}/image` : null,
      })),
    });
  } catch (err) {
    console.error("admin promotions GET error:", err);
    return NextResponse.json({ error: "Could not load promotions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const code = (b.code ?? "").trim().toUpperCase();
  const discountType = ["percentage", "fixed", "free_shipping"].includes(b.discountType) ? b.discountType : null;
  if (!code) return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
  if (!discountType) return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
  if (discountType !== "free_shipping" && (!b.discountValue || Number(b.discountValue) <= 0)) {
    return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
  }
  if (discountType === "percentage" && Number(b.discountValue) > 100) {
    return NextResponse.json({ error: "Percentage discount can't exceed 100" }, { status: 400 });
  }

  try {
    const dup = await query("SELECT id FROM promotions WHERE code = ?", [code]);
    if (dup.length) return NextResponse.json({ error: "A promotion with this code already exists" }, { status: 409 });

    await query(
      `INSERT INTO promotions
        (code, description, discount_type, discount_value, min_order_amount, max_discount_amount,
         start_date, end_date, usage_limit, usage_limit_per_user, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        code,
        (b.description ?? "").trim() || null,
        discountType,
        discountType === "free_shipping" ? 0 : Number(b.discountValue),
        num(b.minOrderAmount),
        discountType === "percentage" ? num(b.maxDiscountAmount) : null,
        b.startDate || null,
        b.endDate || null,
        num(b.usageLimit),
        num(b.usageLimitPerUser),
        b.isActive === false ? 0 : 1,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin promotions POST error:", err);
    return NextResponse.json({ error: "Could not create promotion" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Simple full-record update (matches the admin form, which always submits every field).
  const code = (b.code ?? "").trim().toUpperCase();
  const discountType = ["percentage", "fixed", "free_shipping"].includes(b.discountType) ? b.discountType : null;
  if (!code) return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
  if (!discountType) return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });

  try {
    const dup = await query("SELECT id FROM promotions WHERE code = ? AND id <> ?", [code, b.id]);
    if (dup.length) return NextResponse.json({ error: "A promotion with this code already exists" }, { status: 409 });

    await query(
      `UPDATE promotions SET
        code = ?, description = ?, discount_type = ?, discount_value = ?,
        min_order_amount = ?, max_discount_amount = ?, start_date = ?, end_date = ?,
        usage_limit = ?, usage_limit_per_user = ?, is_active = ?
       WHERE id = ?`,
      [
        code,
        (b.description ?? "").trim() || null,
        discountType,
        discountType === "free_shipping" ? 0 : Number(b.discountValue) || 0,
        num(b.minOrderAmount),
        discountType === "percentage" ? num(b.maxDiscountAmount) : null,
        b.startDate || null,
        b.endDate || null,
        num(b.usageLimit),
        num(b.usageLimitPerUser),
        b.isActive === false ? 0 : 1,
        b.id,
      ]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin promotions PATCH error:", err);
    return NextResponse.json({ error: "Could not update promotion" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("DELETE FROM promotions WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin promotions DELETE error:", err);
    return NextResponse.json({ error: "Could not delete promotion" }, { status: 500 });
  }
}
