import { NextResponse } from "next/server";
import { getDeliveryOffer } from "@/lib/delivery-offer-db";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ offer: await getDeliveryOffer() }, { headers: { "Cache-Control": "no-store" } });
}
