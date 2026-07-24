import { query } from "./db";

export interface HomeCategory {
  id: number;
  name: string;
  slug: string;
  href: string;
  image: string;
}

export interface ShopCategory {
  name: string;
  slug: string;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  homepage_href: string | null;
  has_upload: number;
  image_version: number;
}

export async function getHomeCategories(): Promise<HomeCategory[]> {
  const rows = await query<CategoryRow>(
    `SELECT id, name, slug, image_url, homepage_href,
            CASE WHEN image_data IS NULL THEN 0 ELSE 1 END AS has_upload,
            UNIX_TIMESTAMP(updated_at) AS image_version
     FROM categories
     WHERE homepage_visible = 1
     ORDER BY homepage_order ASC, name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    href: row.homepage_href || `/shop?category=${encodeURIComponent(row.slug)}`,
    image: row.has_upload
      ? `/api/categories/${row.id}/image?v=${row.image_version || 0}`
      : row.image_url || "/images/placeholder.svg",
  }));
}

export async function getShopCategories(): Promise<ShopCategory[]> {
  const rows = await query<{ name: string; slug: string }>(
    `SELECT name, slug
     FROM categories
     WHERE shop_visible = 1
     ORDER BY homepage_order ASC, name ASC`
  );
  return rows;
}
