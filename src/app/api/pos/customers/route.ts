import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { query } from "@/lib/db";

interface CustomerRow {
  id: string; name: string; email: string; phone: string | null;
  address_line1: string | null; address_line2: string | null; city: string | null;
  district: string | null; province: string | null; postal_code: string | null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const search = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (search.length < 1) return NextResponse.json({ customers: [] });
  const term = `%${search.slice(0, 100)}%`;

  try {
    const rows = await query<CustomerRow>(
      `SELECT * FROM (
         SELECT CONCAT('user-', id) id, name, email, phone, address_line1, address_line2, city, district, province, postal_code
         FROM users WHERE role = 'buyer' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
         UNION ALL
         SELECT CONCAT('pos-', id) id, name, '' email, phone, address address_line1, NULL address_line2, city, district, province, postal_code
         FROM pos_customers WHERE name LIKE ? OR phone LIKE ?
       ) customers
       ORDER BY CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name ASC LIMIT 10`,
      [term, term, term, term, term, `${search.slice(0, 100)}%`]
    );
    return NextResponse.json({ customers: rows.map((row) => ({
      id: row.id, name: row.name, email: row.email, phone: row.phone || "",
      addressLine1: row.address_line1 || "", addressLine2: row.address_line2 || "",
      city: row.city || "", district: row.district || "", province: row.province || "",
      postalCode: row.postal_code || "",
    })) });
  } catch (error) {
    console.error("POS customer search failed:", error);
    return NextResponse.json({ error: "Could not search customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { name?: string; phone?: string; address?: string; city?: string; district?: string; province?: string; postalCode?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const name = body.name?.trim() || "";
  const phone = body.phone?.replace(/[\s()-]/g, "") || "";
  const address = body.address?.trim() || "";
  const province = body.province?.trim() || "";
  const district = body.district?.trim() || "";
  const city = body.city?.trim() || "";
  const postalCode = body.postalCode?.trim() || "";
  if (!name || !phone || !address || !province || !district || !city) {
    return NextResponse.json({ error: "Name, phone, address, province, district and city are required" }, { status: 400 });
  }
  if (!/^(?:\+94|94|0)?7\d{8}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid Sri Lankan mobile number" }, { status: 400 });
  }

  try {
    const result = await query<any>(
      "INSERT INTO pos_customers (name, phone, address, city, district, province, postal_code) VALUES (?,?,?,?,?,?,?)",
      [name, phone, address, city, district, province, postalCode || null]
    );
    return NextResponse.json({ customer: {
      id: `pos-${Number((result as any).insertId)}`, name, email: "", phone, addressLine1: address,
      addressLine2: "", city, district, province, postalCode,
    } }, { status: 201 });
  } catch (error) {
    console.error("POS customer creation failed:", error);
    return NextResponse.json({ error: "Could not add customer" }, { status: 500 });
  }
}
