import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  createSession,
  findUserByEmail,
  hashPassword,
} from "@/lib/auth";

interface RegisterBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: "buyer" | "reseller";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const firstName = body.firstName?.trim() || "";
  const lastName = body.lastName?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const phone = body.phone?.trim() || "";
  const password = body.password ?? "";
  const role = body.role === "reseller" ? "reseller" : "buyer";

  // Shared validation
  if (!firstName || !lastName || !email || !phone || !password) {
    return NextResponse.json(
      { error: "Please fill in all required fields" },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Reseller address fields
  const addressLine1 = body.addressLine1?.trim() || null;
  const addressLine2 = body.addressLine2?.trim() || null;
  const city = body.city?.trim() || null;
  const district = body.district?.trim() || null;
  const province = body.province?.trim() || null;
  const postalCode = body.postalCode?.trim() || null;

  if (role === "reseller") {
    if (!addressLine1 || !city || !district || !province || !postalCode) {
      return NextResponse.json(
        { error: "Resellers must provide a complete address" },
        { status: 400 }
      );
    }
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const name = `${firstName} ${lastName}`.trim();
    const result = await query<any>(
      `INSERT INTO users
        (name, first_name, last_name, email, password_hash, role, phone,
         address_line1, address_line2, city, district, province, postal_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        phone,
        addressLine1,
        addressLine2,
        city,
        district,
        province,
        postalCode,
      ]
    );
    const userId = (result as any).insertId as number;

    await createSession(userId);
    return NextResponse.json({
      user: { id: userId, name, email, role },
    });
  } catch (err) {
    console.error("register error:", err);
    return NextResponse.json(
      { error: "Could not create account. Is the database running?" },
      { status: 500 }
    );
  }
}
