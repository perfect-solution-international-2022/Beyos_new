import { NextResponse } from "next/server";
import { requireReseller } from "@/lib/reseller";
import { getCities, getDistricts } from "@/lib/koombiyo";
import { SRI_LANKA_LOCATIONS } from "@/lib/sri-lanka-locations";

export async function GET(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const districtId = Number(new URL(request.url).searchParams.get("districtId"));
  try {
    if (districtId) return NextResponse.json({ cities: await getCities(districtId) });
    return NextResponse.json({ provinces: SRI_LANKA_LOCATIONS, districts: await getDistricts() });
  } catch (error) {
    console.warn("Koombiyo locations unavailable, using local location list", error);
    return NextResponse.json({ provinces: SRI_LANKA_LOCATIONS, districts: [], courierUnavailable: true });
  }
}
