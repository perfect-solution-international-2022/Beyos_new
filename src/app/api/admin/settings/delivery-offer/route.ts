import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { getDeliveryOffer, setDeliveryOffer } from "@/lib/delivery-offer-db";
import { validateDeliveryOffer } from "@/lib/delivery-offer";
export async function GET() {
  if (!await requireAdminSection("sales")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ offer: await getDeliveryOffer() });
}
export async function PUT(request: Request) {
  if (!await requireAdminSection("sales")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let offer;
  try { offer = validateDeliveryOffer(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid offer" }, { status: 400 }); }
  await setDeliveryOffer(offer);
  return NextResponse.json({ offer });
}
