import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search")?.trim().toLowerCase();

  let result = await getAllProducts();
  if (category) result = result.filter((p) => p.category === category);
  if (featured === "true") result = result.filter((p) => p.featured);
  if (search) result = result.filter((p) =>
    `${p.name} ${p.sku || ""} ${p.description} ${p.category}`.toLowerCase().includes(search)
  );

  return NextResponse.json({ count: result.length, products: result });
}
