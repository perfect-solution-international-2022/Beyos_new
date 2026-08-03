import { NextResponse } from "next/server";
import { getMaintenanceMode } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const maintenance = await getMaintenanceMode();
    return NextResponse.json(
      { maintenance },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    // A settings/database problem must not accidentally take the shop offline.
    return NextResponse.json(
      { maintenance: false },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
