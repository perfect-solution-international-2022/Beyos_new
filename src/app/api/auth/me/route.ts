import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch {
    // DB unavailable — treat as logged out rather than crashing the UI.
    return NextResponse.json({ user: null });
  }
}
