import { NextResponse } from "next/server";
import { getAllProducts, getProductSearchSuggestions } from "@/lib/products-db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search")?.trim();

  const user = await getCurrentUser();
  if (search) {
    const products = await getProductSearchSuggestions(search, user?.role === "reseller", 5);
    return NextResponse.json({ count: products.length, products });
  }

  let result = await getAllProducts(user?.role === "reseller");
  if (category) result = result.filter((p) => p.category === category);
  if (featured === "true") result = result.filter((p) => p.featured);
  return NextResponse.json({ count: result.length, products: result });
}
