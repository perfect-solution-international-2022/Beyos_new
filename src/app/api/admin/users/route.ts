import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { hashPassword, findUserByEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (role && role !== "all") {
      conditions.push("role = ?");
      params.push(role);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query<{
      id: number;
      name: string;
      email: string;
      role: string;
      phone: string;
      city: string | null;
      created_at: string;
    }>(
      `SELECT id, name, email, role, phone, city, created_at FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    return NextResponse.json({
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        city: u.city,
        createdAt: u.created_at,
      })),
    });
  } catch (err) {
    console.error("admin users GET error:", err);
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const firstName = (b.firstName ?? "").trim();
  const lastName = (b.lastName ?? "").trim();
  const email = (b.email ?? "").trim().toLowerCase();
  const phone = (b.phone ?? "").trim();
  const password = b.password ?? "";
  const role = ["buyer", "reseller", "admin"].includes(b.role) ? b.role : "buyer";

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "First name, last name, email and password are required" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing.length) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    const hash = await hashPassword(password);
    const name = `${firstName} ${lastName}`.trim();
    await query(
      "INSERT INTO users (name, first_name, last_name, email, password_hash, role, phone) VALUES (?,?,?,?,?,?,?)",
      [name, firstName, lastName, email, hash, role, phone]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users POST error:", err);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (Number(b.id) === admin.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  try {
    await query("DELETE FROM users WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users DELETE error:", err);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: number; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, role } = body;
  if (!id || !["buyer", "reseller", "admin"].includes(role || "")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (id === admin.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  try {
    await query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users PATCH error:", err);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}
