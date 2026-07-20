import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller } from "@/lib/reseller";

interface Row {
  id: number;
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  reseller_price: string | null;
  wholesale_price: string | null;
  wholesale_min_qty: number;
  compare_at_price: string | null;
  image: string;
  description: string;
  rating: string;
  reviews: number;
  stock: number;
  product_type: string;
}

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const [rows, variantRows, settings] = await Promise.all([
      query<Row>(
      `SELECT id, slug, sku, name, category, price, reseller_price, wholesale_price,
              wholesale_min_qty, compare_at_price, image, description, rating, reviews, stock, product_type
       FROM products WHERE is_reseller_product = 1 AND is_publish = 1 ORDER BY name ASC`
      ),
      query<{ id: number; product_id: number; sku: string; attribute_summary: string; price: string; reseller_price: string | null; wholesale_price: string | null; stock: number; image: string | null; is_default: number }>(
        `SELECT id, product_id, sku, attribute_summary, price, reseller_price, wholesale_price,
                stock, image, is_default FROM product_variants ORDER BY is_default DESC, id ASC`
      ),
      query<{ allow_price_override: number; min_markup_pct: string; max_markup_pct: string | null }>(
        "SELECT allow_price_override, min_markup_pct, max_markup_pct FROM users WHERE id = ? LIMIT 1",
        [reseller.id]
      ),
    ]);
    const variantsByProduct = new Map<number, typeof variantRows>();
    for (const variant of variantRows) {
      const current = variantsByProduct.get(variant.product_id) ?? [];
      current.push(variant);
      variantsByProduct.set(variant.product_id, current);
    }
    const products = rows.map((r) => ({
      slug: r.slug,
      sku: r.sku,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      resellerPrice: r.reseller_price ? Number(r.reseller_price) : Number(r.price),
      wholesalePrice: r.wholesale_price
        ? Number(r.wholesale_price)
        : Number(r.price),
      wholesaleMinQty: r.wholesale_min_qty,
      compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : null,
      image: r.image,
      description: r.description,
      rating: Number(r.rating),
      reviews: r.reviews,
      stock: r.stock,
      productType: r.product_type,
      variants: (variantsByProduct.get(r.id) ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        summary: v.attribute_summary,
        price: Number(v.price),
        resellerPrice: v.reseller_price ? Number(v.reseller_price) : (r.reseller_price ? Number(r.reseller_price) : Number(v.price)),
        wholesalePrice: v.wholesale_price ? Number(v.wholesale_price) : (r.wholesale_price ? Number(r.wholesale_price) : Number(v.price)),
        stock: v.stock,
        image: v.image || r.image,
        isDefault: !!v.is_default,
      })),
    }));
    const rule = settings[0];
    return NextResponse.json({
      products,
      pricingRules: {
        allowPriceOverride: rule ? !!rule.allow_price_override : true,
        minMarkupPct: Number(rule?.min_markup_pct ?? 0),
        maxMarkupPct: rule?.max_markup_pct == null ? null : Number(rule.max_markup_pct),
      },
    });
  } catch (err) {
    console.error("reseller products error:", err);
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}
