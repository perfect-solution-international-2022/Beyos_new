"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { RECENTLY_VIEWED_EVENT, RECENTLY_VIEWED_KEY } from "@/lib/recentlyViewed";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";

export default function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]") as Product[];
        setProducts(stored.filter((item) => item.slug !== excludeSlug).slice(0, 4));
      } catch {
        setProducts([]);
      }
    };
    load();
    window.addEventListener(RECENTLY_VIEWED_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [excludeSlug]);

  if (!products.length) return null;
  return (
    <section className="container-x mt-20">
      <SectionHeader eyebrow="Continue Shopping" title="Recently Viewed" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 min-[360px]:grid-cols-2 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
