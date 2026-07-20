import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { getAllProducts } from "@/lib/products-db";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the full Beyos Clothing collection for men, women and accessories.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getAllProducts();

  return (
    <Suspense
      fallback={
        <div className="container-x py-20 text-center text-navy-800/50">
          Loading products…
        </div>
      }
    >
      <ShopClient products={products} />
    </Suspense>
  );
}
