import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import crypto from "crypto";

interface CustomerRow {
  id: number; name: string; email: string; phone: string | null;
  address_line1: string | null; address_line2: string | null; city: string | null;
  district: string | null; province: string | null; postal_code: string | null;
  is_wholesale_customer: number;
}

export async function GET(request: Request) {
  const admin = await requireAdminSection("pos");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const search = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (search.length < 1) return NextResponse.json({ customers: [] });
  const term = `%${search.slice(0, 100)}%`;

  try {
    const rows = await query<CustomerRow>(
      `SELECT id, name, email, phone, address_line1, address_line2, city, district, province, postal_code, is_wholesale_customer
       FROM users
       WHERE role = 'buyer' AND deleted_at IS NULL AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
       ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name ASC LIMIT 10`,
      [term, term, term, `${search.slice(0, 100)}%`]
    );
    return NextResponse.json({ customers: rows.map((row) => ({
      id: `user-${row.id}`, name: row.name, email: row.email.endsWith("@no-login.beyosclothing.internal") ? "" : row.email,
      phone: row.phone || "", addressLine1: row.address_line1 || "", addressLine2: row.address_line2 || "",
      city: row.city || "", district: row.district || "", province: row.province || "", postalCode: row.postal_code || "",
      isWholesaleCustomer: !!row.is_wholesale_customer,
    })) });
  } catch (error) {
    console.error("POS customer search failed:", error);
    return NextResponse.json({ error: "Could not search customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("pos");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { name?: string; phone?: string; address?: string; city?: string; district?: string; province?: string; postalCode?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const name = body.name?.trim() || "";
  const phone = body.phone?.replace(/[\s()-]/g, "") || "";
  const address = body.address?.trim() || "";
  const district = body.district?.trim() || "";
  const city = body.city?.trim() || "";
  const postalCode = body.postalCode?.trim() || "";
  if (!name || !phone || !address || !district || !city) {
    return NextResponse.json({ error: "Name, phone, address, district and city are required" }, { status: 400 });
  }
  if (!/^(?:\+94|94|0)?7\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid Sri Lankan mobile number" }, { status: 400 });
  }

  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || name;
  const lastName = nameParts.slice(1).join(" ");
  const email = `pos-${crypto.randomBytes(6).toString("hex")}@no-login.beyosclothing.internal`;
  const passwordHash = await hashPassword(crypto.randomBytes(24).toString("hex"));

  try {
    const result = await query<any>(
      `INSERT INTO users (name, first_name, last_name, email, password_hash, role, account_source, reseller_status, phone, address_line1, city, district, postal_code)
       VALUES (?,?,?,?,?, 'buyer', 'pos', 'approved', ?,?,?,?,?)`,
      [name, firstName, lastName, email, passwordHash, phone, address, city, district, postalCode || null]
    );
    const id = Number((result as any).insertId);
    return NextResponse.json({ customer: {
      id: `user-${id}`, name, email: "", phone, addressLine1: address,
      addressLine2: "", city, district, province: "", postalCode, isWholesaleCustomer: false,
    } }, { status: 201 });
  } catch (error) {
    console.error("POS customer creation failed:", error);
    return NextResponse.json({ error: "Could not add customer" }, { status: 500 });
  }
}
