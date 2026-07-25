import { Suspense } from "react";
import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { getAllProducts } from "@/lib/products-db";
import { getShopCategories } from "@/lib/categories-db";
import { getCurrentUser } from "@/lib/auth";
import RecentlyViewed from "@/components/RecentlyViewed";

export const metadata: Metadata = {
  title: "Oversized & Graphic T-Shirts Sri Lanka",
  description:
    "Buy premium oversized, graphic and printed T-shirts online in Sri Lanka from Beyos Clothing, with island-wide delivery and secure checkout.",
  keywords: [
    "buy oversized t shirts online Sri Lanka",
    "oversized t shirt price Sri Lanka",
    "graphic t shirts Sri Lanka",
    "printed t shirts online Sri Lanka",
    "mens oversized t shirts Sri Lanka",
    "unisex oversized t shirts Sri Lanka",
    "streetwear clothing Sri Lanka",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Oversized & Graphic T-Shirts Sri Lanka | Beyos Clothing",
    description: "Buy premium oversized and graphic T-shirts online with island-wide delivery across Sri Lanka.",
    url: "/shop",
  },
};

// ISR: cached for speed, refreshed instantly on admin writes via
// revalidatePath("/shop"), with a 60s revalidate as the safety-net upper bound.
export const revalidate = 60;

export default async function ShopPage() {
  const user = await getCurrentUser();
  const resellerOnly = user?.role === "reseller";
  const [products, categories] = await Promise.all([
    getAllProducts(resellerOnly),
    getShopCategories(),
  ]);

  return <>
    <Suspense
      fallback={
        <div className="container-x py-20 text-center text-navy-800/50">
          Loading products…
        </div>
      }
    >
      <ShopClient products={products} categories={categories} />
    </Suspense>
    <RecentlyViewed />
  </>;
}
