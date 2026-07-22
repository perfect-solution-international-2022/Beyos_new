import { query } from "@/lib/db";
import type { Product, ProductVariant } from "./types";

// mysql2 returns JSON columns already parsed as arrays; be defensive if a
// driver/version ever hands back a raw string instead.
function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface ProductRow {
  id: number;
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  compare_at_price: string | null;
  image: string;
  images: unknown;
  description: string;
  sizes: unknown;
  colors: unknown;
  rating: string;
  reviews: number;
  badge: Product["badge"] | null;
  featured: number;
  stock: number;
  product_type: "simple" | "variable";
  weight_kg: string | null;
}

function mapRow(r: ProductRow): Product {
  return {
    id: String(r.id),
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    category: r.category,
    price: Number(r.price),
    compareAtPrice: r.compare_at_price ? Number(r.compare_at_price) : undefined,
    image: r.image,
    images: asArray(r.images),
    description: r.description,
    sizes: asArray(r.sizes),
    colors: asArray(r.colors),
    rating: Number(r.rating),
    reviews: r.reviews,
    badge: r.badge ?? undefined,
    featured: !!r.featured,
    stock: r.stock,
    productType: r.product_type,
    weightKg: r.weight_kg ? Number(r.weight_kg) : undefined,
  };
}

interface VariantRow {
  id: number; product_id: number; sku: string; attribute_summary: string; price: string;
  sale_price: string | null; stock: number; image: string | null; is_default: number;
  weight_kg: string | null;
}

const mapVariant = (row: VariantRow): ProductVariant => ({
  id: row.id, sku: row.sku, attributeSummary: row.attribute_summary, price: Number(row.price),
  salePrice: row.sale_price == null ? undefined : Number(row.sale_price), stock: row.stock,
  image: row.image || undefined, isDefault: !!row.is_default,
  weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
});

// Only products the admin has published and made public are visible to buyers.
const STOREFRONT_WHERE = "visibility = 'public' AND is_publish = 1";
const SELECT_FIELDS = `id, slug, sku, name, category, price, compare_at_price, image, images,
       description, sizes, colors, rating, reviews, badge, featured, stock, product_type, weight_kg`;
const VARIANT_FIELDS = "id, product_id, sku, attribute_summary, price, stock, image, is_default, weight_kg";

export async function getAllProducts(): Promise<Product[]> {
  const [rows, variants] = await Promise.all([
    query<ProductRow>(`SELECT ${SELECT_FIELDS} FROM products WHERE ${STOREFRONT_WHERE} ORDER BY created_at DESC, id DESC`),
    query<VariantRow>(`SELECT ${VARIANT_FIELDS} FROM product_variants ORDER BY is_default DESC, id ASC`),
  ]);
  const variantsByProduct = new Map<number, ProductVariant[]>();
  for (const variant of variants) variantsByProduct.set(variant.product_id, [...(variantsByProduct.get(variant.product_id) || []), mapVariant(variant)]);
  return rows.map((row) => ({ ...mapRow(row), variants: variantsByProduct.get(row.id) || [] }));
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products WHERE slug = ? AND ${STOREFRONT_WHERE} LIMIT 1`,
    [slug]
  );
  if (!rows[0]) return undefined;
  const variants = await query<VariantRow>(
    `SELECT ${VARIANT_FIELDS} FROM product_variants WHERE product_id = ? ORDER BY is_default DESC, id ASC`,
    [rows[0].id]
  );
  return { ...mapRow(rows[0]), variants: variants.map(mapVariant) };
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products WHERE category = ? AND ${STOREFRONT_WHERE} ORDER BY created_at DESC, id DESC`,
    [category]
  );
  return rows.map(mapRow);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products WHERE featured = 1 AND ${STOREFRONT_WHERE} ORDER BY created_at DESC, id DESC`
  );
  return rows.map(mapRow);
}

export async function getRelatedProducts(slug: string, category: string): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products
     WHERE category = ? AND slug <> ? AND ${STOREFRONT_WHERE}
     ORDER BY created_at DESC, id DESC LIMIT 4`,
    [category, slug]
  );
  return rows.map(mapRow);
}
