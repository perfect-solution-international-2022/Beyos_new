import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 140);
}
const num = (v: unknown) => (v === "" || v === undefined || v === null ? null : Number(v));
const asArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return v.split(",").map((s) => s.trim()).filter(Boolean); } }
  return [];
};
const csv = (v: unknown): string[] =>
  typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? (v as string[]) : [];

function uploadedImageIds(values: unknown[]): number[] {
  const ids = values.flatMap((value) => {
    const match = String(value || "").match(/^\/api\/products\/images\/(\d+)$/);
    return match ? [Number(match[1])] : [];
  });
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

async function associateImages(productId: number, featured: unknown, gallery: unknown) {
  const ids = uploadedImageIds([featured, ...csv(gallery)]);
  if (ids.length) {
    await query(
      `UPDATE product_images SET product_id = ? WHERE id IN (${ids.map(() => "?").join(",")})`,
      [productId, ...ids]
    );
    await query(
      `DELETE FROM product_images WHERE product_id = ? AND id NOT IN (${ids.map(() => "?").join(",")})`,
      [productId, ...ids]
    );
  } else {
    await query("DELETE FROM product_images WHERE product_id = ?", [productId]);
  }
}

async function saveVariants(productId: number, variants: any[]) {
  await query("DELETE FROM product_variants WHERE product_id = ?", [productId]);
  for (const v of variants ?? []) {
    const extendedSql = `INSERT INTO product_variants
        (product_id, sku, attribute_summary, price, sale_price, reseller_price, wholesale_price, wholesale_min_qty,
         production_cost, stock_status, stock, low_stock_threshold, weight_kg, length_cm, width_cm, height_cm, is_default, image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const common = [productId, (v.sku ?? "").trim(), (v.attributeSummary ?? "").trim(), Number(v.price) || 0];
    try {
      await query(extendedSql, [...common, num(v.salePrice), num(v.resellerPrice), num(v.wholesalePrice), Number(v.wholesaleMinQty) || 0,
        num(v.productionCost), v.stockStatus || "in_stock", Number(v.stock) || 0, Number(v.lowStockThreshold) || 10,
        num(v.weightKg), num(v.lengthCm), num(v.widthCm), num(v.heightCm), v.isDefault ? 1 : 0, (v.image ?? "").trim() || null]);
    } catch (error: any) {
      if (error?.code !== "ER_BAD_FIELD_ERROR") throw error;
      // Keep deployments on the original schema functional until the additive migration runs.
      await query(
        `INSERT INTO product_variants
          (product_id, sku, attribute_summary, price, reseller_price, wholesale_price, stock, low_stock_threshold, is_default, image)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [...common, num(v.resellerPrice), num(v.wholesalePrice), Number(v.stock) || 0,
          Number(v.lowStockThreshold) || 10, v.isDefault ? 1 : 0, (v.image ?? "").trim() || null]
      );
    }
  }
}

async function saveLinks(productId: number, links: any[]) {
  await query("DELETE FROM product_links WHERE product_id = ?", [productId]);
  for (const l of links ?? []) {
    if (!l.linkedProductId || Number(l.linkedProductId) === productId) continue;
    await query(
      "INSERT INTO product_links (product_id, linked_product_id, link_type) VALUES (?,?,?)",
      [productId, Number(l.linkedProductId), l.linkType || "related"]
    );
  }
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<any>(`SELECT * FROM products ORDER BY created_at DESC, id DESC`);
    const variants = await query<any>(`SELECT * FROM product_variants ORDER BY id ASC`);
    const links = await query<any>(`SELECT * FROM product_links`);
    const vByP = new Map<number, any[]>();
    for (const v of variants) { (vByP.get(v.product_id) ?? vByP.set(v.product_id, []).get(v.product_id))!.push(v); }
    const lByP = new Map<number, any[]>();
    for (const l of links) { (lByP.get(l.product_id) ?? lByP.set(l.product_id, []).get(l.product_id))!.push(l); }

    return NextResponse.json({
      products: rows.map((r) => {
        const compare = r.compare_at_price ? Number(r.compare_at_price) : null;
        const price = Number(r.price);
        return {
          id: r.id, slug: r.slug, sku: r.sku, name: r.name, category: r.category,
          productType: r.product_type ?? "simple",
          shortDescription: r.short_description ?? "", description: r.description ?? "",
          // regular/sale mapping: if there's a compare price, price is the sale price.
          regularPrice: compare ?? price,
          salePrice: compare ? price : "",
          price, compareAtPrice: compare,
          productionCost: num(r.production_cost), resellerPrice: num(r.reseller_price),
          wholesalePrice: num(r.wholesale_price), wholesaleMinQty: r.wholesale_min_qty,
          saleStart: r.sale_start ? String(r.sale_start).slice(0, 10) : "",
          saleEnd: r.sale_end ? String(r.sale_end).slice(0, 10) : "",
          stock: r.stock, lowStockThreshold: r.low_stock_threshold,
          stockStatus: r.stock_status ?? "in_stock", allowBackorder: !!r.allow_backorder,
          soldIndividually: !!r.sold_individually,
          sizes: asArray(r.sizes), colors: asArray(r.colors),
          image: r.image, images: asArray(r.images),
          badge: r.badge, featured: !!r.featured, isPublish: !!r.is_publish,
          visibility: r.visibility ?? "public", isResellerProduct: !!r.is_reseller_product,
          paymentMethods: csv(r.payment_methods), tags: csv(r.tags),
          weightKg: num(r.weight_kg), lengthCm: num(r.length_cm), widthCm: num(r.width_cm), heightCm: num(r.height_cm),
          metaTitle: r.meta_title ?? "", metaDescription: r.meta_description ?? "", metaKeywords: r.meta_keywords ?? "",
          variants: (vByP.get(r.id) ?? []).map((v) => ({
            id: v.id, sku: v.sku, attributeSummary: v.attribute_summary, price: Number(v.price),
            salePrice: num(v.sale_price), resellerPrice: num(v.reseller_price), wholesalePrice: num(v.wholesale_price),
            wholesaleMinQty: v.wholesale_min_qty, productionCost: num(v.production_cost), stockStatus: v.stock_status,
            stock: v.stock, lowStockThreshold: v.low_stock_threshold, weightKg: num(v.weight_kg), lengthCm: num(v.length_cm),
            widthCm: num(v.width_cm), heightCm: num(v.height_cm), isDefault: !!v.is_default, image: v.image,
          })),
          links: (lByP.get(r.id) ?? []).map((l) => ({ linkedProductId: l.linked_product_id, linkType: l.link_type })),
        };
      }),
    });
  } catch (err) {
    console.error("admin products GET error:", err);
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}

// Map regular/sale price inputs to stored price + compare_at_price.
function pricePair(b: any): { price: number; compare: number | null } {
  const regular = Number(b.regularPrice ?? b.price) || 0;
  const sale = b.salePrice === "" || b.salePrice === undefined || b.salePrice === null ? null : Number(b.salePrice);
  if (sale && sale > 0 && sale < regular) return { price: sale, compare: regular };
  return { price: regular, compare: null };
}

const productTextLimits: Record<string, [string, number]> = {
  name: ["Product name", 200], shortDescription: ["Short description", 500], description: ["Description", 10000],
  sku: ["SKU", 60], sizes: ["Sizes", 500], colors: ["Colors", 500], tags: ["Tags", 500],
  metaTitle: ["Meta title", 255], metaDescription: ["Meta description", 500], metaKeywords: ["Meta keywords", 255],
};

function productTextError(b: any, requireName: boolean): string | null {
  for (const [key, [label, max]] of Object.entries(productTextLimits)) {
    if (b[key] === undefined || Array.isArray(b[key])) continue;
    const value = String(b[key]).trim();
    if (value.length > max) return `${label} must be ${max} characters or fewer`;
    if (/[<>]/.test(value)) return `${label} cannot contain < or > characters`;
  }
  const name = String(b.name ?? "").trim();
  if (requireName && !name) return "Product name is required";
  if (name && name.length < 2) return "Product name must contain at least 2 characters";
  const sku = String(b.sku ?? "").trim();
  if (sku && !/^[A-Za-z0-9._-]+$/.test(sku)) return "SKU can only contain letters, numbers, dots, underscores, and hyphens";
  return null;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const textError = productTextError(b, true);
  if (textError) return NextResponse.json({ error: textError }, { status: 400 });
  if (csv(b.paymentMethods).length === 0) {
    return NextResponse.json({ error: "Please select at least one payment method" }, { status: 400 });
  }

  const name = (b.name ?? "").trim();
  const category = (b.category ?? "").trim() || "men";
  const variants = Array.isArray(b.variants) ? b.variants : [];
  if (b.productType === "variable" && variants.length === 0) {
    return NextResponse.json({ error: "Generate at least one variation before creating a variable product" }, { status: 400 });
  }
  if (b.productType === "variable" && variants.some((variant: any) => !(Number(variant.price) > 0))) {
    return NextResponse.json({ error: "Every variation needs a valid regular price" }, { status: 400 });
  }
  const defaultVariant = variants.find((variant: any) => variant.isDefault) || variants[0];
  const pricingSource = b.productType === "variable" && defaultVariant
    ? { ...b, regularPrice: defaultVariant.price, salePrice: defaultVariant.salePrice }
    : b;
  const { price, compare } = pricePair(pricingSource);
  if (!name || price <= 0) return NextResponse.json({ error: "Name and a valid regular price are required" }, { status: 400 });

  const slug = ((b.slug ?? "").trim() ? slugify(b.slug) : slugify(name)) + "-" + Math.random().toString(36).slice(2, 5);
  const sku = (b.sku ?? "").trim() || "BEY-" + Math.floor(1000 + Math.random() * 8999);
  const image = (b.image ?? "").trim() || "/images/placeholder.svg";
  const gallery = csv(b.images);
  const images = JSON.stringify(gallery.length ? gallery : [image]);
  const sizes = JSON.stringify(csv(b.sizes).length ? csv(b.sizes) : ["S", "M", "L", "XL"]);
  const colors = JSON.stringify(csv(b.colors).length ? csv(b.colors) : ["Black", "White"]);

  try {
    let productId = 0;
    try {
    const res = await query<any>(
      `INSERT INTO products
        (slug, sku, name, category, product_type, short_description, description, price, compare_at_price,
         production_cost, reseller_price, wholesale_price, wholesale_min_qty, sale_start, sale_end,
         image, images, sizes, colors, rating, reviews, badge, featured, is_publish, visibility,
         is_reseller_product, stock, low_stock_threshold, stock_status, allow_backorder, sold_individually,
         payment_methods, tags, weight_kg, length_cm, width_cm, height_cm, meta_title, meta_description, meta_keywords)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        slug, sku, name, category, b.productType === "variable" ? "variable" : "simple",
        (b.shortDescription ?? "").trim() || null, (b.description ?? "").trim() || "A quality Beyos garment.",
        price, compare, num(b.productionCost),
        num(b.resellerPrice) ?? Math.round(price * 0.8), num(b.wholesalePrice) ?? Math.round(price * 0.72),
        Number(b.wholesaleMinQty) || 50, b.saleStart || null, b.saleEnd || null,
        image, images, sizes, colors,
        b.badge || null, b.featured ? 1 : 0, b.isPublish === false ? 0 : 1, b.visibility || "public",
        b.isResellerProduct === false ? 0 : 1,
        b.productType === "variable" ? variants.reduce((sum: number, variant: any) => sum + (Number(variant.stock) || 0), 0) : Number(b.stock) || 0,
        Number(b.lowStockThreshold) || 10,
        b.stockStatus || "in_stock", b.allowBackorder ? 1 : 0, b.soldIndividually ? 1 : 0,
        csv(b.paymentMethods).join(",") || null, csv(b.tags).join(",") || null,
        num(b.weightKg), num(b.lengthCm), num(b.widthCm), num(b.heightCm),
        (b.metaTitle ?? "").trim() || null, (b.metaDescription ?? "").trim() || null, (b.metaKeywords ?? "").trim() || null,
      ]
    );
    productId = (res as any).insertId;
    await saveVariants(productId, variants);
    await saveLinks(productId, b.links);
    await associateImages(productId, image, gallery);
    return NextResponse.json({ ok: true, slug });
    } catch (error) {
      if (productId) await query("DELETE FROM products WHERE id = ?", [productId]).catch(() => {});
      throw error;
    }
  } catch (err) {
    console.error("admin products POST error:", err);
    return NextResponse.json({ error: "Could not create product" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const textError = productTextError(b, false);
  if (textError) return NextResponse.json({ error: textError }, { status: 400 });
  if (b.paymentMethods !== undefined && csv(b.paymentMethods).length === 0) {
    return NextResponse.json({ error: "Please select at least one payment method" }, { status: 400 });
  }

  const scalar: Record<string, string> = {
    name: "name", category: "category", sku: "sku", productType: "product_type",
    shortDescription: "short_description", description: "description",
    productionCost: "production_cost", resellerPrice: "reseller_price", wholesalePrice: "wholesale_price",
    wholesaleMinQty: "wholesale_min_qty", saleStart: "sale_start", saleEnd: "sale_end",
    stock: "stock", lowStockThreshold: "low_stock_threshold", stockStatus: "stock_status",
    badge: "badge", image: "image", visibility: "visibility",
    weightKg: "weight_kg", lengthCm: "length_cm", widthCm: "width_cm", heightCm: "height_cm",
    metaTitle: "meta_title", metaDescription: "meta_description", metaKeywords: "meta_keywords",
  };
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, col] of Object.entries(scalar)) {
    if (b[key] !== undefined) { sets.push(`${col} = ?`); params.push(b[key] === "" ? null : b[key]); }
  }
  // Regular/sale price
  if (b.regularPrice !== undefined || b.salePrice !== undefined || b.price !== undefined) {
    const { price, compare } = pricePair(b);
    sets.push("price = ?"); params.push(price);
    sets.push("compare_at_price = ?"); params.push(compare);
  }
  const bools: Record<string, string> = {
    featured: "featured", isPublish: "is_publish", isResellerProduct: "is_reseller_product",
    allowBackorder: "allow_backorder", soldIndividually: "sold_individually",
  };
  for (const [key, col] of Object.entries(bools)) {
    if (b[key] !== undefined) { sets.push(`${col} = ?`); params.push(b[key] ? 1 : 0); }
  }
  if (b.sizes !== undefined) { sets.push("sizes = ?"); params.push(JSON.stringify(csv(b.sizes))); }
  if (b.colors !== undefined) { sets.push("colors = ?"); params.push(JSON.stringify(csv(b.colors))); }
  if (b.images !== undefined) { sets.push("images = ?"); params.push(JSON.stringify(csv(b.images))); }
  if (b.paymentMethods !== undefined) { sets.push("payment_methods = ?"); params.push(csv(b.paymentMethods).join(",") || null); }
  if (b.tags !== undefined) { sets.push("tags = ?"); params.push(csv(b.tags).join(",") || null); }

  try {
    if (sets.length) {
      params.push(b.id);
      await query(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, params);
    }
    if (b.variants !== undefined) await saveVariants(b.id, b.variants);
    if (b.links !== undefined) await saveLinks(b.id, b.links);
    if (b.image !== undefined || b.images !== undefined) await associateImages(b.id, b.image, b.images);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin products PATCH error:", err);
    return NextResponse.json({ error: "Could not update product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("DELETE FROM products WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin products DELETE error:", err);
    return NextResponse.json({ error: "Could not delete product" }, { status: 500 });
  }
}
