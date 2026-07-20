import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/products-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");

  let result = await getAllProducts();
  if (category) result = result.filter((p) => p.category === category);
  if (featured === "true") result = result.filter((p) => p.featured);

  return NextResponse.json({ count: result.length, products: result });
}
