import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { nextSriLankaMidnight } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      user,
      serverNow: Math.floor(Date.now() / 1000),
      sessionExpiresAt: nextSriLankaMidnight(),
      timeZone: "Asia/Colombo",
    });
  } catch {
    // DB unavailable — treat as logged out rather than crashing the UI.
    return NextResponse.json({
      user: null,
      serverNow: Math.floor(Date.now() / 1000),
      sessionExpiresAt: nextSriLankaMidnight(),
      timeZone: "Asia/Colombo",
    });
  }
}
