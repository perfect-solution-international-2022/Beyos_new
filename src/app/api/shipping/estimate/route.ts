import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products-db";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";

interface EstimateLine {
  slug: string;
  quantity: number;
  variantId?: number;
}

const FREE_SHIPPING_THRESHOLD = 10000;

export async function POST(request: Request) {
  let body: { items?: EstimateLine[]; discountedSubtotal?: number; freeShipping?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const items = body.items ?? [];
  const discountedSubtotal = Number(body.discountedSubtotal) || 0;

  if (body.freeShipping || discountedSubtotal >= FREE_SHIPPING_THRESHOLD || items.length === 0) {
    return NextResponse.json({ shipping: 0 });
  }

  let totalWeightKg = 0;
  for (const line of items) {
    const product = await getProductBySlug(line.slug);
    if (!product) continue;
    const variant = line.variantId ? product.variants?.find((v) => v.id === Number(line.variantId)) : undefined;
    const qty = Math.max(1, Number(line.quantity) || 1);
    totalWeightKg += (variant?.weightKg ?? product.weightKg ?? 0) * qty;
  }

  const pricing = await getDeliveryPricing();
  const shipping = computeDeliveryFee(totalWeightKg, pricing);
  return NextResponse.json({ shipping });
}
