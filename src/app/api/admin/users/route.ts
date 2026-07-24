import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";
import { hashPassword, findUserByEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdminSection("people");
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
      admin_role: string | null;
      phone: string;
      city: string | null;
      reseller_status: string;
      allow_price_override: number;
      min_markup_pct: string;
      max_markup_pct: string | null;
      credit_limit: string;
      created_at: string;
    }>(
      `SELECT id, name, email, role, admin_role, phone, city, reseller_status, allow_price_override,
              min_markup_pct, max_markup_pct, credit_limit, created_at
       FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    return NextResponse.json({
      users: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        adminRole: u.admin_role,
        phone: u.phone,
        city: u.city,
        resellerStatus: u.reseller_status,
        allowPriceOverride: !!u.allow_price_override,
        minMarkupPct: Number(u.min_markup_pct),
        maxMarkupPct: u.max_markup_pct == null ? null : Number(u.max_markup_pct),
        creditLimit: Number(u.credit_limit),
        createdAt: u.created_at,
      })),
    });
  } catch (err) {
    console.error("admin users GET error:", err);
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("people");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const firstName = (b.firstName ?? "").trim();
  const lastName = (b.lastName ?? "").trim();
  const email = (b.email ?? "").trim().toLowerCase();
  const phone = (b.phone ?? "").trim();
  const password = b.password ?? "";
  const role = ["buyer", "reseller", "admin"].includes(b.role) ? b.role : "buyer";
  const adminRole = role === "admin" && ["super", "manager", "cashier"].includes(b.adminRole) ? b.adminRole : role === "admin" ? "super" : null;

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
      "INSERT INTO users (name, first_name, last_name, email, password_hash, role, admin_role, reseller_status, phone) VALUES (?,?,?,?,?,?,?,?,?)",
      [name, firstName, lastName, email, hash, role, adminRole, "approved", phone]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users POST error:", err);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSection("people");
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
  const admin = await requireAdminSection("people");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: number; role?: string; adminRole?: string; resellerStatus?: string; pricingRules?: { allowPriceOverride?: boolean; minMarkupPct?: number; maxMarkupPct?: number | null; creditLimit?: number } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, role, adminRole, resellerStatus, pricingRules } = body;
  if (!id || (!role && !adminRole && !resellerStatus && !pricingRules)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (id === admin.id) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  try {
    if (role) {
      if (!["buyer", "reseller", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const nextAdminRole = role === "admin"
        ? (["super", "manager", "cashier"].includes(adminRole || "") ? adminRole : "super")
        : null;
      await query(
        "UPDATE users SET role = ?, admin_role = ?, reseller_status = ?, session_version = session_version + 1 WHERE id = ?",
        [role, nextAdminRole, "approved", id]
      );
    } else if (adminRole) {
      if (!["super", "manager", "cashier"].includes(adminRole)) {
        return NextResponse.json({ error: "Invalid admin role" }, { status: 400 });
      }
      await query(
        "UPDATE users SET admin_role = ?, session_version = session_version + 1 WHERE id = ? AND role = 'admin'",
        [adminRole, id]
      );
    } else if (resellerStatus) {
      if (!["approved", "suspended", "rejected"].includes(resellerStatus || "")) {
        return NextResponse.json({ error: "Invalid reseller status" }, { status: 400 });
      }
      await query(
        "UPDATE users SET reseller_status = ?, session_version = session_version + 1 WHERE id = ? AND role = 'reseller'",
        [resellerStatus, id]
      );
    } else if (pricingRules) {
      const min = Math.max(0, Number(pricingRules.minMarkupPct) || 0);
      const max = pricingRules.maxMarkupPct == null ? null : Number(pricingRules.maxMarkupPct);
      if (max != null && (!Number.isFinite(max) || max < min)) {
        return NextResponse.json({ error: "Maximum markup must be greater than or equal to minimum markup" }, { status: 400 });
      }
      await query(
        `UPDATE users SET allow_price_override = ?, min_markup_pct = ?, max_markup_pct = ?, credit_limit = ?
         WHERE id = ? AND role = 'reseller'`,
        [pricingRules.allowPriceOverride === false ? 0 : 1, min, max, Math.max(0, Number(pricingRules.creditLimit) || 0), id]
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users PATCH error:", err);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}
