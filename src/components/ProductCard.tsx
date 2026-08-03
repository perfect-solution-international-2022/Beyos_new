"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/context/WishlistProvider";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import ProductBadges from "./ProductBadges";

const QuickView = dynamic(() => import("./QuickView"), { ssr: false });

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [loadHoverImage, setLoadHoverImage] = useState(false);
  const wished = has(product.slug);
  const displayedPrice = user?.isWholesaleCustomer && product.wholesalePrice != null && product.wholesalePrice > 0 && product.wholesalePrice < product.price ? product.wholesalePrice : product.price;
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-navy-800/10 bg-white shadow-[0_4px_18px_rgba(8,24,39,.07)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/35 hover:shadow-[0_18px_45px_rgba(8,24,39,.13)]">
      <div
        className="relative overflow-hidden bg-[#f1f3f5]"
        onPointerEnter={() => setLoadHoverImage(true)}
        onFocusCapture={() => setLoadHoverImage(true)}
      >
        <Link href={`/product/${product.slug}`} className="block">
          <div className="aspect-square w-full">
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              width={1500}
              height={1500}
              sizes="(max-width: 359px) calc(100vw - 32px), (max-width: 767px) calc(50vw - 26px), (max-width: 1023px) 33vw, 25vw"
              quality={60}
              loading="lazy"
              className={`h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.04] ${hoverImage ? "group-hover:opacity-0" : ""}`}
            />
            {hoverImage && loadHoverImage && (
              <Image
                src={hoverImage}
                alt={`${product.name} alternate view`}
                fill
                sizes="(max-width: 359px) calc(100vw - 32px), (max-width: 767px) calc(50vw - 26px), (max-width: 1023px) 33vw, 25vw"
                quality={60}
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-100 object-cover opacity-0 transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
              />
            )}
          </div>
        </Link>

        <ProductBadges product={product} />

        <button
          onClick={onWishlist}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-navy-800 shadow-[0_4px_16px_rgba(8,24,39,.12)] backdrop-blur-md transition duration-200 hover:scale-105 hover:bg-white ${heartBurst ? "scale-125" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={wished ? "#ff8426" : "none"}
            stroke={wished ? "#ff8426" : "#10263d"}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
        </button>

        <div className="absolute inset-x-3 bottom-3 z-10">
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label="Quick view"
            aria-haspopup="dialog"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-white shadow-lg transition-all duration-300 hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:ml-auto lg:h-11 lg:w-full lg:translate-y-3 lg:gap-2 lg:rounded-xl lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:focus-visible:translate-y-0 lg:focus-visible:opacity-100"
          >
            <EyeIcon />
            <span className="hidden text-sm font-semibold lg:inline">Quick view</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">{product.category}</p>
          <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-navy-800/55">
            <StarIcon />
            <span>{product.rating.toFixed(1)}</span>
            <span className="hidden sm:inline">({product.reviews})</span>
          </div>
        </div>
        <Link
          href={`/product/${product.slug}`}
          className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-navy-800 transition hover:text-brand sm:text-[15px]"
        >
          {product.name}
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-extrabold tracking-tight text-navy-800 sm:text-lg">
            {formatPrice(displayedPrice)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-navy-800/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
        <div className="mt-auto flex min-h-7 items-end justify-between gap-2 pt-3">
          <div className="flex items-center -space-x-1">
            {product.colors.slice(0, 4).map((color) => (
              <span key={color} title={color} className="h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(16,38,61,.12)]" style={{ backgroundColor: swatchColor(color) }} />
            ))}
            {product.colors.length > 4 && <span className="ml-2 text-[10px] font-semibold text-navy-800/50">+{product.colors.length - 4}</span>}
          </div>
          {user?.isWholesaleCustomer && displayedPrice !== product.price ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Wholesale</span>
          ) : (
            <span className={`text-[10px] font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {product.stock > 0 ? "In stock" : "Out of stock"}
            </span>
          )}
        </div>
      </div>
      {quickViewOpen && <QuickView product={product} onClose={() => setQuickViewOpen(false)} />}
    </article>
  );
}

const SWATCH_COLORS: Record<string, string> = {
  black: "#171717", white: "#ffffff", navy: "#142b43", charcoal: "#41464b",
  sand: "#d8c3a5", olive: "#66704a", grey: "#9ca3af", "heather grey": "#b5b7ba",
  coral: "#ef7f6d", ivory: "#f5f0df", emerald: "#16836b", blush: "#e9b7b0",
  champagne: "#dfc69f", mauve: "#a87888", blue: "#4778b5", red: "#c9473d",
  green: "#4f7b52", beige: "#d7c5aa", brown: "#795548", pink: "#db8fa4",
};

function swatchColor(color: string) {
  return SWATCH_COLORS[color.trim().toLowerCase()] || color;
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff8426">
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
