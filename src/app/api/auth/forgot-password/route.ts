import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth";
import { createPasswordResetToken, isRateLimited } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/mail";

// Always return the same generic message whether or not the email exists —
// otherwise this endpoint becomes an account-enumeration oracle.
const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a password reset link.",
};

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const users = await findUserByEmail(email);
    const user = users[0];

    if (user) {
      if (await isRateLimited(user.id)) {
        // Still return the generic response — don't leak that this email exists.
        return NextResponse.json(GENERIC_RESPONSE);
      }
      const token = await createPasswordResetToken(user.id);
      const origin = new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (err) {
    console.error("forgot-password error:", err);
    // Even on failure, don't reveal internals to the client.
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
