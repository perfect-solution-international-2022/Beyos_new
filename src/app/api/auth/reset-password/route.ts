import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { consumePasswordResetToken } from "@/lib/passwordReset";
import { query } from "@/lib/db";
import { consumeRateLimit, requestIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`reset-password:${requestIp(request)}`, 10, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many reset attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const token = body.token?.trim();
  const password = body.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Missing reset token" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await query(
      "UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
      [passwordHash, userId]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      { error: "Could not reset your password. Please try again." },
      { status: 500 }
    );
  }
}
