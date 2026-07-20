import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface ProfileRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: "buyer" | "reseller";
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const rows = await query<ProfileRow>(
      `SELECT id, first_name, last_name, email, phone, role,
              address_line1, address_line2, city, district, province, postal_code
       FROM users WHERE id = ? LIMIT 1`,
      [user.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const r = rows[0];
    return NextResponse.json({
      profile: {
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        addressLine1: r.address_line1 ?? "",
        addressLine2: r.address_line2 ?? "",
        city: r.city ?? "",
        district: r.district ?? "",
        province: r.province ?? "",
        postalCode: r.postal_code ?? "",
      },
    });
  } catch (err) {
    console.error("account GET error:", err);
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required" },
      { status: 400 }
    );
  }

  const name = `${firstName} ${lastName}`.trim();

  try {
    await query(
      `UPDATE users SET
        name = ?, first_name = ?, last_name = ?, phone = ?,
        address_line1 = ?, address_line2 = ?, city = ?, district = ?,
        province = ?, postal_code = ?
       WHERE id = ?`,
      [
        name,
        firstName,
        lastName,
        phone,
        body.addressLine1?.trim() || null,
        body.addressLine2?.trim() || null,
        body.city?.trim() || null,
        body.district?.trim() || null,
        body.province?.trim() || null,
        body.postalCode?.trim() || null,
        user.id,
      ]
    );
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    console.error("account PATCH error:", err);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
