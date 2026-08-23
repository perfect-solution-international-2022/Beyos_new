import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection, requireSuperAdmin } from "@/lib/admin";
import { hashPassword, findUserByEmail } from "@/lib/auth";

interface AdminUserRow {
  id: number;
  accountSource: "web" | "pos";
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  adminRole: string | null;
  phone: string;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  isWholesaleCustomer: boolean;
  wholesaleSince: string | null;
  resellerStatus: string;
  accountStatus: string;
  lastLoginAt: string | null;
  allowPriceOverride: boolean;
  minMarkupPct: number;
  maxMarkupPct: number | null;
  creditLimit: number;
  createdAt: string;
}

export async function GET(request: Request) {
  const admin = await requireAdminSection("people");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const wholesale = searchParams.get("wholesale");

  try {
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: unknown[] = [];
    if (role && role !== "all") {
      conditions.push("role = ?");
      params.push(role);
    }
    if (wholesale === "true") conditions.push("role = 'buyer' AND is_wholesale_customer = 1");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query<{
      id: number;
      name: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      account_source: "web" | "pos";
      admin_role: string | null;
      phone: string;
      city: string | null;
      address_line1: string | null;
      address_line2: string | null;
      district: string | null;
      province: string | null;
      postal_code: string | null;
      is_wholesale_customer: number;
      wholesale_since: string | null;
      reseller_status: string;
      account_status: string;
      last_login_at: string | null;
      allow_price_override: number;
      min_markup_pct: string;
      max_markup_pct: string | null;
      credit_limit: string;
      created_at: string;
    }>(
      `SELECT id, name, first_name, last_name, email, role, account_source, admin_role, phone, city, address_line1, address_line2,
              district, province, postal_code, is_wholesale_customer, wholesale_since, reseller_status,
              account_status, last_login_at, allow_price_override, min_markup_pct, max_markup_pct, credit_limit, created_at
       FROM users ${where} ORDER BY created_at DESC`,
      params
    );
    const users: AdminUserRow[] = rows.map((u) => ({
      id: u.id,
      accountSource: u.account_source,
      name: u.name,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.account_source === "pos" ? "" : u.email,
      role: u.role,
      adminRole: u.admin_role,
      phone: u.phone,
      city: u.city,
      addressLine1: u.address_line1,
      addressLine2: u.address_line2,
      district: u.district,
      province: u.province,
      postalCode: u.postal_code,
      isWholesaleCustomer: !!u.is_wholesale_customer,
      wholesaleSince: u.wholesale_since,
      resellerStatus: u.reseller_status,
      accountStatus: u.account_status,
      lastLoginAt: u.last_login_at,
      allowPriceOverride: !!u.allow_price_override,
      minMarkupPct: Number(u.min_markup_pct),
      maxMarkupPct: u.max_markup_pct == null ? null : Number(u.max_markup_pct),
      creditLimit: Number(u.credit_limit),
      createdAt: u.created_at,
    }));
    return NextResponse.json({ users });
  } catch (err) {
    console.error("admin users GET error:", err);
    return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
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
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (Number(b.id) === admin.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  try {
    await query("UPDATE users SET deleted_at = NOW(), account_status = 'disabled', session_version = session_version + 1 WHERE id = ? AND deleted_at IS NULL", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin users DELETE error:", err);
    return NextResponse.json({ error: "Could not delete user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    id?: number;
    role?: string;
    adminRole?: string;
    resellerStatus?: string;
    accountStatus?: string;
    profile?: { firstName?: string; lastName?: string; email?: string; phone?: string; city?: string };
    pricingRules?: { allowPriceOverride?: boolean; minMarkupPct?: number; maxMarkupPct?: number | null; creditLimit?: number };
    wholesaleCustomer?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { id, role, adminRole, resellerStatus, accountStatus, profile, pricingRules, wholesaleCustomer } = body;
  if (!id || (!role && !adminRole && !resellerStatus && !accountStatus && !profile && !pricingRules && wholesaleCustomer === undefined)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (id === admin.id && (role || adminRole || accountStatus)) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }
  try {
    if (wholesaleCustomer !== undefined) {
      const result = await query(
        `UPDATE users SET is_wholesale_customer = ?,
                wholesale_since = IF(? = 1, COALESCE(wholesale_since, NOW()), NULL)
         WHERE id = ? AND role = 'buyer' AND deleted_at IS NULL`,
        [wholesaleCustomer ? 1 : 0, wholesaleCustomer ? 1 : 0, id]
      ) as unknown as { affectedRows: number };
      if (!result.affectedRows) return NextResponse.json({ error: "Only registered customer accounts can be marked as wholesale" }, { status: 400 });
    } else if (role) {
      if (!["buyer", "reseller", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      const nextAdminRole = role === "admin"
        ? (["super", "manager", "cashier"].includes(adminRole || "") ? adminRole : "super")
        : null;
      await query(
        "UPDATE users SET role = ?, admin_role = ?, reseller_status = ?, is_wholesale_customer = IF(? = 'buyer', is_wholesale_customer, 0), wholesale_since = IF(? = 'buyer', wholesale_since, NULL), session_version = session_version + 1 WHERE id = ?",
        [role, nextAdminRole, "approved", role, role, id]
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
    } else if (accountStatus) {
      if (!['active', 'suspended', 'disabled'].includes(accountStatus)) {
        return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
      }
      await query(
        "UPDATE users SET account_status = ?, session_version = session_version + 1 WHERE id = ?",
        [accountStatus, id]
      );
    } else if (profile) {
      const firstName = String(profile.firstName || "").trim();
      const lastName = String(profile.lastName || "").trim();
      const email = String(profile.email || "").trim().toLowerCase();
      const phone = String(profile.phone || "").trim();
      const city = String(profile.city || "").trim();
      // A POS-added walk-in customer has no real email on file — leave it as
      // a blank field the admin can optionally fill in, rather than forcing one.
      if (!firstName || !lastName || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return NextResponse.json({ error: "First name, last name and a valid email are required" }, { status: 400 });
      }
      if (email) {
        const existing = await query<{ id: number }>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [email, id]);
        if (existing.length) return NextResponse.json({ error: "Another account already uses this email" }, { status: 409 });
      }
      await query(
        "UPDATE users SET first_name = ?, last_name = ?, name = ?, email = IF(? = '', email, ?), phone = ?, city = ? WHERE id = ?",
        [firstName, lastName, `${firstName} ${lastName}`, email, email, phone, city || null, id]
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
