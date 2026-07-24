import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { getAllProducts } from "@/lib/products-db";
import { getShopCategories } from "@/lib/categories-db";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the full Beyos Clothing collection for men and women.",
};

// ISR: cached for speed, refreshed instantly on admin writes via
// revalidatePath("/shop"), with a 60s revalidate as the safety-net upper bound.
export const revalidate = 60;

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
