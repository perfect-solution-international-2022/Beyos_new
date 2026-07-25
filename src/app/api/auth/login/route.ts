import { NextResponse } from "next/server";
import { createSession, findUserByEmail, getCurrentUser, verifyPassword } from "@/lib/auth";
import { consumeRateLimit, requestIp } from "@/lib/rateLimit";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const ipRate = consumeRateLimit(`login:ip:${requestIp(request)}`, 20, 15 * 60_000);
  const accountRate = consumeRateLimit(`login:account:${email}`, 8, 15 * 60_000);
  if (!ipRate.allowed || !accountRate.allowed) {
    const retryAfter = Math.max(ipRate.retryAfterSeconds, accountRate.retryAfterSeconds);
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const users = await findUserByEmail(email);
    const user = users[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    if (user.account_status !== "active") {
      return NextResponse.json(
        { error: user.account_status === "suspended" ? "Your account has been suspended. Contact support." : "Your account is disabled. Contact support." },
        { status: 403 }
      );
    }

    await createSession(user.id);
    await query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
    const sessionUser = await getCurrentUser();
    if (!sessionUser) throw new Error("Could not read the newly created session");
    return NextResponse.json({ user: sessionUser });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Could not sign in. Is the database running?" },
      { status: 500 }
    );
  }
}
