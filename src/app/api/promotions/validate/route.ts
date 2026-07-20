import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { validatePromoCode } from "@/lib/promotions";

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to use a promo code." }, { status: 401 });
  }

  let body: { code?: string; subtotal?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code?.trim();
  const subtotal = Number(body.subtotal);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ error: "Missing code or subtotal" }, { status: 400 });
  }

  const result = await validatePromoCode(code, subtotal, user.id);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    code: result.promotion?.code,
    description: result.promotion?.description,
    discountType: result.promotion?.discountType,
    subtotalDiscount: result.subtotalDiscount,
    freeShipping: result.freeShipping,
  });
}
