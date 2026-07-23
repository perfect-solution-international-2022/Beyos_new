import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { findOpenShift } from "@/lib/pos";

export async function GET() {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      id: number;
      name: string;
      is_active: number;
      created_at: string;
    }>("SELECT id, name, is_active, created_at FROM pos_cashiers ORDER BY name ASC");

    const cashiers = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        isActive: !!r.is_active,
        createdAt: r.created_at,
        onShift: !!(await findOpenShift(r.id)),
      }))
    );
    return NextResponse.json({ cashiers });
  } catch (err) {
    console.error("admin pos cashiers GET error:", err);
    return NextResponse.json({ error: "Could not load cashiers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: { name?: string; pin?: string };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const name = (b.name ?? "").trim();
  const pin = (b.pin ?? "").trim();
  if (!name) return NextResponse.json({ error: "Cashier name is required" }, { status: 400 });
  if (!/^\d{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4–6 digits" }, { status: 400 });
  }

  try {
    const pinHash = await hashPassword(pin);
    await query("INSERT INTO pos_cashiers (name, pin_hash) VALUES (?, ?)", [name, pinHash]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin pos cashiers POST error:", err);
    return NextResponse.json({ error: "Could not create cashier" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: { id?: number; name?: string; pin?: string; isActive?: boolean };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sets: string[] = [];
  const params: unknown[] = [];
  if (b.name !== undefined) {
    const name = b.name.trim();
    if (!name) return NextResponse.json({ error: "Cashier name is required" }, { status: 400 });
    sets.push("name = ?");
    params.push(name);
  }
  if (b.pin !== undefined && b.pin !== "") {
    if (!/^\d{4,6}$/.test(b.pin)) {
      return NextResponse.json({ error: "PIN must be 4–6 digits" }, { status: 400 });
    }
    sets.push("pin_hash = ?");
    params.push(await hashPassword(b.pin));
  }
  if (b.isActive !== undefined) {
    sets.push("is_active = ?");
    params.push(b.isActive ? 1 : 0);
  }
  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    params.push(b.id);
    await query(`UPDATE pos_cashiers SET ${sets.join(", ")} WHERE id = ?`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin pos cashiers PATCH error:", err);
    return NextResponse.json({ error: "Could not update cashier" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSection("system");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: { id?: number };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("DELETE FROM pos_cashiers WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin pos cashiers DELETE error:", err);
    return NextResponse.json({ error: "Could not delete cashier" }, { status: 500 });
  }
}
