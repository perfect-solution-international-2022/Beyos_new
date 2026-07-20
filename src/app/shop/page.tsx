import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { getAllProducts } from "@/lib/products-db";
import { getShopCategories } from "@/lib/categories-db";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the full Beyos Clothing collection for men and women.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getShopCategories(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="container-x py-20 text-center text-navy-800/50">
          Loading products…
        </div>
      }
    >
      <ShopClient products={products} categories={categories} />
    </Suspense>
  );
}
