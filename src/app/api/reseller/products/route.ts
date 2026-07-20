import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller } from "@/lib/reseller";

interface Row {
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
}

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const rows = await query<Row>(
      `SELECT slug, sku, name, category, price, reseller_price, wholesale_price,
              wholesale_min_qty, compare_at_price, image, description, rating, reviews, stock
       FROM products ORDER BY name ASC`
    );
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
    }));
    return NextResponse.json({ products });
  } catch (err) {
    console.error("reseller products error:", err);
    return NextResponse.json({ error: "Could not load products" }, { status: 500 });
  }
}
