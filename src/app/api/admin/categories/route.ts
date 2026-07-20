import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 200);

const homepageHref = (value: unknown) => {
  const href = String(value ?? "").trim();
  if (!href) return null;
  if (!href.startsWith("/") || href.startsWith("//")) return undefined;
  return href.slice(0, 500);
};

const homepageOrder = (value: unknown) =>
  Math.max(0, Math.min(9999, Math.trunc(Number(value) || 0)));

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      id: number; name: string; slug: string; parent_id: number | null;
      image_url: string | null; parent_name: string | null; product_count: number;
      homepage_visible: number; shop_visible: number; homepage_order: number; homepage_href: string | null;
      has_uploaded_image: number; image_version: number;
    }>(
      `SELECT c.id, c.name, c.slug, c.parent_id, c.image_url,
              c.homepage_visible, c.shop_visible, c.homepage_order, c.homepage_href,
              CASE WHEN c.image_data IS NULL THEN 0 ELSE 1 END AS has_uploaded_image,
              UNIX_TIMESTAMP(c.updated_at) AS image_version,
              p.name AS parent_name,
              (SELECT COUNT(*) FROM products pr WHERE pr.category = c.slug) AS product_count
       FROM categories c LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY c.name ASC`
    );
    return NextResponse.json({
      categories: rows.map((r) => ({
        id: r.id, name: r.name, slug: r.slug, parentId: r.parent_id,
        parentName: r.parent_name,
        imageUrl: r.has_uploaded_image
          ? `/api/categories/${r.id}/image?v=${r.image_version || 0}`
          : r.image_url ?? "",
        hasUploadedImage: Boolean(r.has_uploaded_image),
        homepageVisible: Boolean(r.homepage_visible),
        shopVisible: Boolean(r.shop_visible),
        homepageOrder: Number(r.homepage_order),
        homepageHref: r.homepage_href ?? "",
        productCount: Number(r.product_count),
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
  const href = homepageHref(b.homepageHref);
  if (href === undefined) return NextResponse.json({ error: "Homepage link must be an internal path beginning with /" }, { status: 400 });
  try {
    const dup = await query("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (dup.length) return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    await query(
      `INSERT INTO categories
         (name, slug, parent_id, homepage_visible, shop_visible, homepage_order, homepage_href)
       VALUES (?,?,?,?,?,?,?)`,
      [name, slug, b.parentId || null, Boolean(b.homepageVisible), Boolean(b.shopVisible), homepageOrder(b.homepageOrder), href]
    );
    const created = await query<{ id: number }>("SELECT id FROM categories WHERE slug = ? LIMIT 1", [slug]);
    return NextResponse.json({ ok: true, id: created[0]?.id });
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
  const href = homepageHref(b.homepageHref);
  if (href === undefined) return NextResponse.json({ error: "Homepage link must be an internal path beginning with /" }, { status: 400 });
  if (b.parentId && Number(b.parentId) === Number(b.id))
    return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 });
  try {
    const dup = await query("SELECT id FROM categories WHERE slug = ? AND id <> ?", [slug, b.id]);
    if (dup.length) return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
    await query(
      `UPDATE categories
       SET name = ?, slug = ?, parent_id = ?, homepage_visible = ?, shop_visible = ?, homepage_order = ?, homepage_href = ?
       WHERE id = ?`,
      [name, slug, b.parentId || null, Boolean(b.homepageVisible), Boolean(b.shopVisible), homepageOrder(b.homepageOrder), href, b.id]
    );
    return NextResponse.json({ ok: true, id: Number(b.id) });
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
