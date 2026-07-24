"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistProvider";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function WishlistPage() {
  const { slugs, remove, loading } = useWishlist();
  const addItem = useCart((s) => s.addItem);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCatalog(d.products ?? []))
      .finally(() => setCatalogLoading(false));
  }, []);

  const items = catalog.filter((p) => slugs.includes(p.slug));
  const isLoading = loading || catalogLoading;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">My Wishlist</h1>

      {isLoading ? (
        <p className="mt-6 text-navy-800/50">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-navy-800/5 bg-white py-16 text-center shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-400">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
          </span>
          <p className="font-semibold text-navy-800/70">Your wishlist is empty</p>
          <Link href="/shop" className="btn-primary">
            Discover Products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div
              key={p.slug}
              className="flex gap-4 rounded-2xl border border-navy-800/5 bg-white p-4 shadow-sm"
            >
              <Link
                href={`/product/${p.slug}`}
                className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-navy-50"
              >
                <Image
                  src={p.image}
                  alt={p.name}
                  width={96}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link
                  href={`/product/${p.slug}`}
                  className="text-sm font-semibold text-navy-800 hover:text-brand"
                >
                  {p.name}
                </Link>
                <p className="mt-1 text-sm font-bold text-navy-800">
                  {formatPrice(p.price)}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-3">
                  <button
                    onClick={() =>
                      addItem({
                        productId: p.id,
                        slug: p.slug,
                        name: p.name,
                        price: p.price,
                        image: p.image,
                        size: p.sizes[0],
                        color: p.colors[0],
                        quantity: 1,
                      })
                    }
                    className="rounded-full bg-navy-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => remove(p.slug)}
                    className="rounded-full border border-navy-800/15 px-4 py-2 text-xs font-semibold text-navy-800/70 transition hover:border-red-300 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
