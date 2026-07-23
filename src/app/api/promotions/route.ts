import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query<any>(
      `SELECT id, code, description, discount_type, discount_value, min_order_amount,
              max_discount_amount, end_date, (image_data IS NOT NULL) AS has_image
       FROM promotions
       WHERE is_active = 1
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
         AND (usage_limit IS NULL OR usage_limit > (
           SELECT COUNT(*) FROM promotion_usages u WHERE u.promotion_id = promotions.id
         ))
       ORDER BY created_at DESC`
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
        endDate: r.end_date,
        imageUrl: r.has_image ? `/api/promotions/${r.id}/image` : null,
      })),
    });
  } catch (err) {
    console.error("public promotions GET error:", err);
    return NextResponse.json({ error: "Could not load promotions" }, { status: 500 });
  }
}
