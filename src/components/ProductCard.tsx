"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/context/WishlistProvider";
import { useAuth } from "@/context/AuthProvider";

const badgeStyles: Record<string, string> = {
  New: "bg-navy-800 text-white",
  Sale: "bg-brand text-white",
  Bestseller: "bg-brand-100 text-brand-700",
};

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const wished = has(product.slug);

  const onWishlist = async () => {
    if (!user) {
      router.push(`/login?redirect=/product/${product.slug}`);
      return;
    }
    await toggle(product.slug);
  };

  const quickAdd = () => {
    if (product.productType === "variable") {
      router.push(`/product/${product.slug}`);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      size: product.sizes[0],
      color: product.colors[0],
      quantity: 1,
    });
  };

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-navy-50">
        <Link href={`/product/${product.slug}`} className="block">
          <div className="aspect-[4/5] w-full">
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={500}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>

        {product.badge && (
          <span className={`badge absolute left-3 top-3 ${badgeStyles[product.badge]}`}>
            {product.badge}
          </span>
        )}

        <button
          onClick={onWishlist}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 sm:right-3 sm:top-3"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={wished ? "#f5851f" : "none"}
            stroke={wished ? "#f5851f" : "#0f2540"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
        </button>

        <button
          onClick={quickAdd}
          className="absolute inset-x-2 bottom-2 rounded-full bg-navy-800 py-2.5 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:bg-brand sm:inset-x-3 sm:bottom-3 lg:translate-y-4 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          Quick Add
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Link
          href={`/product/${product.slug}`}
          className="text-sm font-semibold text-navy-800 transition hover:text-brand"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-navy-800/50">
          <StarIcon />
          <span>{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-navy-800">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-navy-800/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5851f">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" />
    </svg>
  );
}
