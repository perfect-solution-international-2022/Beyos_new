import { deliveryOfferQuote, type DeliveryChannel } from "@/lib/delivery-offer";
import { getDeliveryOffer } from "@/lib/delivery-offer-db";
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
  let body: { items?: EstimateLine[]; discountedSubtotal?: number; freeShipping?: boolean; channel?: DeliveryChannel; wholesale?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid shipping request" }, { status: 400 });
  const items = body.items ?? [];
  const discountedSubtotal = Number(body.discountedSubtotal) || 0;

  const channel = body.channel ?? "website";
  if (!["website", "pos", "reseller"].includes(channel) || !Array.isArray(items) || items.some(line => !line || typeof line.slug !== "string" || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 10000)) return NextResponse.json({ error: "Invalid shipping request" }, { status: 400 });
  if ((channel === "website" && (body.freeShipping || discountedSubtotal >= FREE_SHIPPING_THRESHOLD)) || items.length === 0) {
    return NextResponse.json({ shipping: 0 });
  }

  let totalWeightKg = 0;
  for (const line of items) {
    const product = await getProductBySlug(line.slug);
    if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    const variant = line.variantId ? product.variants?.find((v) => v.id === Number(line.variantId)) : undefined;
    if (line.variantId && !variant) return NextResponse.json({ error: "Unknown product variation" }, { status: 400 });
    const qty = Math.max(1, Number(line.quantity) || 1);
    totalWeightKg += (variant?.weightKg ?? product.weightKg ?? 0) * qty;
  }

  const pricing = await getDeliveryPricing();
  const shipping = computeDeliveryFee(totalWeightKg, pricing);
  // Wholesale customers always pay weight-based delivery — the quantity offer is a retail promotion.
  if (body.wholesale) return NextResponse.json({ shipping, offerName: null });
  const quote = deliveryOfferQuote(await getDeliveryOffer(), channel, items, shipping);
  return NextResponse.json({ shipping: quote.fee, offerName: quote.offerName });
}
