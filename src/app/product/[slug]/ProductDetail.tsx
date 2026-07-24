"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { WHOLESALE_MIN_QTY } from "@/lib/pricing";

// Matches the admin's attribute order (Size, then Color) — see
// src/app/admin/products/page.tsx's generateVariations().
const GROUP_LABELS = ["Size", "Color"];

// Variant attribute summaries look like "L / White" — one token per admin
// attribute group (Size, Color, ...), in the same order for every variant of
// a product. Splitting by position lets us render one pill-picker per
// attribute instead of a single flat dropdown of every combination.
function variantOptionGroups(variants: NonNullable<Product["variants"]>): string[][] {
  const groupCount = Math.max(0, ...variants.map((v) => v.attributeSummary.split(" / ").length));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (const variant of variants) {
    const tokens = variant.attributeSummary.split(" / ");
    tokens.forEach((token, i) => {
      if (token && !groups[i].includes(token)) groups[i].push(token);
    });
  }
  return groups;
}

export default function ProductDetail({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0];
  const optionGroups = variantOptionGroups(variants);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    defaultVariant?.attributeSummary.split(" / ") ?? []
  );
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(defaultVariant?.image || product.images[0] || product.image);
  const [added, setAdded] = useState(false);

  const addItem = useCart((s) => s.addItem);
  const selectedVariant = variants.find(
    (variant) => variant.attributeSummary === selectedOptions.join(" / ")
  );
  const regularPrice = selectedVariant?.price ?? product.compareAtPrice ?? product.price;
  const salePrice = selectedVariant?.salePrice && selectedVariant.salePrice < regularPrice
    ? selectedVariant.salePrice : selectedVariant?.price ?? product.price;
  const comparePrice = selectedVariant?.salePrice && selectedVariant.salePrice < regularPrice
    ? regularPrice : product.compareAtPrice;
  const currentStock = selectedVariant?.stock ?? product.stock;

  const wholesalePrice = selectedVariant?.wholesalePrice ?? product.wholesalePrice;
  const wholesaleActive = quantity >= WHOLESALE_MIN_QTY && wholesalePrice != null && wholesalePrice > 0 && wholesalePrice < salePrice;
  const currentPrice = wholesaleActive ? wholesalePrice : salePrice;
  const discount = comparePrice
    ? Math.round((1 - currentPrice / comparePrice) * 100)
    : 0;

  const handleAdd = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: salePrice,
      wholesalePrice: wholesalePrice ?? undefined,
      image: selectedVariant?.image || product.image,
      size: selectedVariant?.attributeSummary || size,
      color: selectedVariant ? "" : color,
      quantity,
      variantId: selectedVariant?.id,
      variantSummary: selectedVariant?.attributeSummary,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Gallery */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row">
        {product.images.length > 1 && (
          <div className="flex gap-3 sm:flex-col">
            {product.images.map((img) => (
              <button
                key={img}
                onClick={() => setActiveImage(img)}
                className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-navy-50 ring-2 transition ${
                  activeImage === img ? "ring-brand" : "ring-transparent"
                }`}
              >
                <Image
                  src={img}
                  alt={product.name}
                  width={64}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1 overflow-hidden rounded-3xl bg-navy-50">
          <div className="aspect-[4/5] w-full">
            <Image
              src={activeImage}
              alt={product.name}
              width={640}
              height={800}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          {product.badge && (
            <span className="badge absolute left-4 top-4 bg-brand text-white">
              {product.badge}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">
          {product.category}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-navy-800">
          {product.name}
        </h1>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-0.5 text-brand">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={i < Math.round(product.rating) ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-navy-800/50">
            {product.rating.toFixed(1)} · {product.reviews} reviews
          </span>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-3xl font-bold text-navy-800">
            {formatPrice(currentPrice)}
          </span>
          {comparePrice && comparePrice > currentPrice && (
            <>
              <span className="text-lg text-navy-800/40 line-through">
                {formatPrice(comparePrice)}
              </span>
              <span className="badge bg-brand-50 text-brand-700">
                -{discount}%
              </span>
            </>
          )}
          {wholesaleActive && (
            <span className="badge bg-emerald-50 text-emerald-700">Bulk price applied</span>
          )}
        </div>

        {wholesalePrice != null && wholesalePrice > 0 && (
          <p className="mt-2 text-sm text-navy-800/60">
            {wholesaleActive
              ? `Bulk price of ${formatPrice(wholesalePrice)}/unit applied for ${WHOLESALE_MIN_QTY}+ units.`
              : `Buy ${WHOLESALE_MIN_QTY}+ units and pay ${formatPrice(wholesalePrice)} per unit.`}
          </p>
        )}

        <p className="mt-6 leading-relaxed text-navy-800/70">
          {product.description}
        </p>

        {product.productType === "variable" && variants.length ? (
          <div className="mt-7 space-y-6">
            {optionGroups.map((values, groupIndex) => (
              <div key={groupIndex}>
                <p className="text-sm font-semibold text-navy-800">
                  {GROUP_LABELS[groupIndex] ?? `Option ${groupIndex + 1}`}
                  {selectedOptions[groupIndex] && (
                    <span className="font-normal text-navy-800/60"> : {selectedOptions[groupIndex]}</span>
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {values.map((value) => {
                    const candidate = selectedOptions.map((v, i) => (i === groupIndex ? value : v));
                    const matches = variants.filter((v) => v.attributeSummary === candidate.join(" / "));
                    const available = matches.some((v) => v.stock > 0);
                    const isSelected = selectedOptions[groupIndex] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          const next = selectedOptions.map((v, i) => (i === groupIndex ? value : v));
                          setSelectedOptions(next);
                          setQuantity(1);
                          const match = variants.find((v) => v.attributeSummary === next.join(" / "));
                          if (match?.image) setActiveImage(match.image);
                        }}
                        className={`min-w-[3rem] rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isSelected
                            ? "border-navy-800 bg-navy-800 text-white"
                            : "border-navy-800/15 text-navy-800 hover:border-navy-800/40"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {selectedVariant ? (
              <p className="text-xs text-navy-800/50">SKU: {selectedVariant.sku || product.sku}</p>
            ) : (
              <p className="text-xs text-red-500">This combination is unavailable.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-7">
              <p className="text-sm font-semibold text-navy-800">Color: <span className="font-normal text-navy-800/60">{color}</span></p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.colors.map((item) => <button key={item} onClick={() => setColor(item)} className={`rounded-full border px-4 py-2 text-sm font-medium transition ${color === item ? "border-brand bg-brand-50 text-brand-700" : "border-navy-800/15 text-navy-800 hover:border-navy-800/40"}`}>{item}</button>)}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-sm font-semibold text-navy-800">Size: <span className="font-normal text-navy-800/60">{size}</span></p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((item) => <button key={item} onClick={() => setSize(item)} className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-semibold transition ${size === item ? "border-navy-800 bg-navy-800 text-white" : "border-navy-800/15 text-navy-800 hover:border-navy-800/40"}`}>{item}</button>)}
              </div>
            </div>
          </>
        )}

        {/* Quantity + Add */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center justify-between rounded-full border border-navy-800/15 px-2 sm:justify-start">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-11 w-11 items-center justify-center text-lg text-navy-800 hover:text-brand"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(Math.max(1, currentStock), q + 1))}
              className="flex h-11 w-11 items-center justify-center text-lg text-navy-800 hover:text-brand"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button onClick={handleAdd} disabled={currentStock < 1 || (product.productType === "variable" && !selectedVariant)} className="btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50">
            {currentStock < 1 ? "Out of Stock" : added ? "✓ Added to Cart" : "Add to Cart"}
          </button>
        </div>

        {/* Meta */}
        <ul className="mt-8 space-y-3 border-t border-navy-800/10 pt-6 text-sm text-navy-800/70">
          <li className="flex items-center gap-3">
            <DotIcon /> In stock — ships in 2–4 business days
          </li>
          <li className="flex items-center gap-3">
            <DotIcon /> Island-wide delivery
          </li>
          <li className="flex items-center gap-3">
            <DotIcon /> 7-day easy returns & exchanges
          </li>
        </ul>
      </div>
    </div>
  );
}

function DotIcon() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}
