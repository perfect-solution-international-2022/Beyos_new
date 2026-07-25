"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/WishlistProvider";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import ProductBadges from "./ProductBadges";
import QuickView from "./QuickView";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const wished = has(product.slug);
  const hoverImage = product.images.find((image) => image !== product.image);

  const onWishlist = async () => {
    if (!user) {
      router.push(`/login?redirect=/product/${product.slug}`);
      return;
    }
    const toggled = await toggle(product.slug);
    if (toggled) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 450);
      toast(wished ? "Removed from wishlist" : "Saved to wishlist", wished ? "info" : "success");
    }
  };

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl bg-navy-50">
        <Link href={`/product/${product.slug}`} className="block">
          <div className="aspect-square w-full">
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              width={1500}
              height={1500}
              sizes="(max-width: 359px) calc(100vw - 32px), (max-width: 767px) calc(50vw - 26px), (max-width: 1023px) 33vw, 25vw"
              quality={60}
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${hoverImage ? "group-hover:opacity-0" : ""}`}
            />
            {hoverImage && (
              <Image
                src={hoverImage}
                alt={`${product.name} alternate view`}
                fill
                sizes="(max-width: 359px) calc(100vw - 32px), (max-width: 767px) calc(50vw - 26px), (max-width: 1023px) 33vw, 25vw"
                quality={60}
                className="absolute inset-0 h-full w-full scale-100 object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
              />
            )}
          </div>
        </Link>

        <ProductBadges product={product} />

        <button
          onClick={onWishlist}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 sm:right-3 sm:top-3 ${heartBurst ? "scale-125" : ""}`}
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
          onClick={() => setQuickViewOpen(true)}
          className="absolute inset-x-2 bottom-2 rounded-full bg-navy-800 py-2.5 text-xs font-semibold text-white shadow-lg transition-all duration-300 hover:bg-brand sm:inset-x-3 sm:bottom-3 lg:translate-y-4 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          Quick View
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <Link
          href={`/product/${product.slug}`}
          className="text-sm font-semibold text-navy-800 transition hover:text-brand"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-navy-800/75">
          <StarIcon />
          <span>{product.rating.toFixed(1)}</span>
          <span>({product.reviews})</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-navy-800">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-navy-800/70 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
      {quickViewOpen && <QuickView product={product} onClose={() => setQuickViewOpen(false)} />}
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
