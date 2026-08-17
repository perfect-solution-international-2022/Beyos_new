import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { syncCourierUpdates } from "@/lib/courier-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Lets sales admins refresh every active Koombiyo order on demand. */
export async function POST() {
  const admin = await requireAdminSection("sales");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    return NextResponse.json(await syncCourierUpdates());
  } catch (error) {
    console.error("Admin courier sync failed:", error);
    return NextResponse.json({ error: "Courier sync failed" }, { status: 500 });
  }
}
