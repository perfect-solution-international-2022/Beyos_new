import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 200);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      id: number; name: string; slug: string; parent_id: number | null;
      image_url: string | null; parent_name: string | null; product_count: number;
    }>(
      `SELECT c.id, c.name, c.slug, c.parent_id, c.image_url,
              p.name AS parent_name,
              (SELECT COUNT(*) FROM products pr WHERE pr.category = c.slug) AS product_count
       FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY c.name ASC`
    );
    return NextResponse.json({
      categories: rows.map((r) => ({
        id: r.id, name: r.name, slug: r.slug, parentId: r.parent_id,
        parentName: r.parent_name, imageUrl: r.image_url ?? "", productCount: Number(r.product_count),
      })),
    });
  } catch (err) {
    console.error("admin categories GET error:", err);
    return NextResponse.json({ error: "Could not load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const name = (b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  const slug = (b.slug ?? "").trim() ? slugify(b.slug) : slugify(name);
  try {
    const dup = await query("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (dup.length) return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    await query(
      "INSERT INTO categories (name, slug, parent_id, image_url) VALUES (?,?,?,?)",
      [name, slug, b.parentId || null, (b.imageUrl ?? "").trim() || null]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin categories POST error:", err);
    return NextResponse.json({ error: "Could not create category" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const name = (b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  const slug = (b.slug ?? "").trim() ? slugify(b.slug) : slugify(name);
  if (b.parentId && Number(b.parentId) === Number(b.id))
    return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
  try {
    await query(
      "UPDATE categories SET name = ?, slug = ?, parent_id = ?, image_url = ? WHERE id = ?",
      [name, slug, b.parentId || null, (b.imageUrl ?? "").trim() || null, b.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin categories PATCH error:", err);
    return NextResponse.json({ error: "Could not update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("DELETE FROM categories WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin categories DELETE error:", err);
    return NextResponse.json({ error: "Could not delete category" }, { status: 500 });
  }
}
