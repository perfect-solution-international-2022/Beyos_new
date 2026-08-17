import { NextResponse } from "next/server";
import { syncCourierUpdates } from "@/lib/courier-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.COURIER_SYNC_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncCourierUpdates());
  } catch (error) {
    console.error("Courier sync failed:", error);
    return NextResponse.json({ error: "Courier sync failed" }, { status: 500 });
  }
}
