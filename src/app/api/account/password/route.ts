import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword, DbUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const rows = await query<DbUser>(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [user.id]
    );
    const dbUser = rows[0];
    if (!dbUser || !(await verifyPassword(currentPassword, dbUser.password_hash))) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      user.id,
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("password change error:", err);
    return NextResponse.json(
      { error: "Could not update password" },
      { status: 500 }
    );
  }
}
