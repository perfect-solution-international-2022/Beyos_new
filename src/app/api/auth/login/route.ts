import { NextResponse } from "next/server";
import { createSession, findUserByEmail, verifyPassword } from "@/lib/auth";
import { consumeRateLimit, requestIp } from "@/lib/rateLimit";

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

    await createSession(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminRole: user.role === "admin" ? user.admin_role : null,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { error: "Could not sign in. Is the database running?" },
      { status: 500 }
    );
  }
}
