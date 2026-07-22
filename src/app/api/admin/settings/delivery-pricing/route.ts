import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getDeliveryPricing, setDeliveryPricing } from "@/lib/shipping";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pricing = await getDeliveryPricing();
  return NextResponse.json({ pricing });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { basePrice?: number; extraKgPrice?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const basePrice = Number(body.basePrice);
  const extraKgPrice = Number(body.extraKgPrice);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return NextResponse.json({ error: "Enter a valid base price for the first kg" }, { status: 400 });
  }
  if (!Number.isFinite(extraKgPrice) || extraKgPrice < 0) {
    return NextResponse.json({ error: "Enter a valid price for each additional kg" }, { status: 400 });
  }

  await setDeliveryPricing({ basePrice, extraKgPrice });
  return NextResponse.json({ ok: true, pricing: { basePrice, extraKgPrice } });
}
