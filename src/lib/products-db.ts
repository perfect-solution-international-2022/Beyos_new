import { query } from "@/lib/db";
import type { Product } from "./types";

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
}

function mapRow(r: ProductRow): Product {
  return {
    id: String(r.id),
    slug: r.slug,
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
  };
}

// Only products the admin has published and made public are visible to buyers.
const STOREFRONT_WHERE = "visibility = 'public' AND is_publish = 1";
const SELECT_FIELDS = `id, slug, name, category, price, compare_at_price, image, images,
       description, sizes, colors, rating, reviews, badge, featured, stock`;

export async function getAllProducts(): Promise<Product[]> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products WHERE ${STOREFRONT_WHERE} ORDER BY created_at DESC, id DESC`
  );
  return rows.map(mapRow);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const rows = await query<ProductRow>(
    `SELECT ${SELECT_FIELDS} FROM products WHERE slug = ? AND ${STOREFRONT_WHERE} LIMIT 1`,
    [slug]
  );
  return rows[0] ? mapRow(rows[0]) : undefined;
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
