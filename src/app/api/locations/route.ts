import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCities, getDistricts } from "@/lib/koombiyo";

export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const districtId = Number(new URL(request.url).searchParams.get("districtId"));
  try {
    if (districtId > 0) return NextResponse.json({ cities: await getCities(districtId) });
    return NextResponse.json({ districts: await getDistricts() });
  } catch (error) {
    console.error("Courier locations error:", error);
    return NextResponse.json({ error: "Courier locations are temporarily unavailable" }, { status: 502 });
  }
}
