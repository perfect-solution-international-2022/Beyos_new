import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 200);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const attrs = await query<{ id: number; name: string; slug: string }>(
      "SELECT id, name, slug FROM attributes ORDER BY name ASC"
    );
    const values = await query<{ id: number; attribute_id: number; value: string }>(
      "SELECT id, attribute_id, value FROM attribute_values ORDER BY value ASC"
    );
    const byAttr = new Map<number, { id: number; value: string }[]>();
    for (const v of values) {
      const list = byAttr.get(v.attribute_id) ?? [];
      list.push({ id: v.id, value: v.value });
      byAttr.set(v.attribute_id, list);
    }
    return NextResponse.json({
      attributes: attrs.map((a) => ({ id: a.id, name: a.name, slug: a.slug, values: byAttr.get(a.id) ?? [] })),
    });
  } catch (err) {
    console.error("admin attributes GET error:", err);
    return NextResponse.json({ error: "Could not load attributes" }, { status: 500 });
  }
}

// Create an attribute with values, OR add values to an existing attribute.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const values: string[] = Array.isArray(b.values)
    ? b.values
    : typeof b.values === "string"
      ? b.values.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  try {
    // Add values to an existing attribute.
    if (b.attributeId) {
      if (values.length === 0) return NextResponse.json({ error: "At least one value is required" }, { status: 400 });
      for (const v of values) {
        const dup = await query("SELECT id FROM attribute_values WHERE attribute_id = ? AND value = ?", [b.attributeId, v]);
        if (dup.length === 0) await query("INSERT INTO attribute_values (attribute_id, value) VALUES (?, ?)", [b.attributeId, v]);
      }
      return NextResponse.json({ ok: true });
    }

    // Create a new attribute with values.
    const name = (b.attributeName ?? b.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Attribute name is required" }, { status: 400 });
    if (values.length === 0) return NextResponse.json({ error: "At least one value is required" }, { status: 400 });
    const slug = slugify(name);
    const dup = await query("SELECT id FROM attributes WHERE slug = ?", [slug]);
    if (dup.length) return NextResponse.json({ error: "An attribute with this name already exists" }, { status: 409 });
    const res = await query<any>("INSERT INTO attributes (name, slug) VALUES (?, ?)", [name, slug]);
    const attrId = (res as any).insertId;
    for (const v of values) await query("INSERT INTO attribute_values (attribute_id, value) VALUES (?, ?)", [attrId, v]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin attributes POST error:", err);
    return NextResponse.json({ error: "Could not save attribute" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const name = (b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Attribute name is required" }, { status: 400 });
  try {
    await query("UPDATE attributes SET name = ?, slug = ? WHERE id = ?", [name, slugify(name), b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin attributes PATCH error:", err);
    return NextResponse.json({ error: "Could not update attribute" }, { status: 500 });
  }
}

// Delete an attribute (id) or a single value (valueId).
export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  try {
    if (b.valueId) {
      await query("DELETE FROM attribute_values WHERE id = ?", [b.valueId]);
      return NextResponse.json({ ok: true });
    }
    if (b.id) {
      await query("DELETE FROM attributes WHERE id = ?", [b.id]);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  } catch (err) {
    console.error("admin attributes DELETE error:", err);
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
}
