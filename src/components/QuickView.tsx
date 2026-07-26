"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/store/cart";
import { useToast } from "@/context/ToastProvider";
import ProductBadges from "./ProductBadges";
import { WHOLESALE_MIN_QTY } from "@/lib/pricing";
import { useAuth } from "@/context/AuthProvider";

export default function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { user } = useAuth();
  const variants = product.variants ?? [];
  const [variantId, setVariantId] = useState(variants.find((item) => item.isDefault)?.id ?? variants[0]?.id);
  const [size, setSize] = useState(product.sizes[0] || "One Size");
  const [color, setColor] = useState(product.colors[0] || "Default");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);
  const existingCartQuantity = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const { toast } = useToast();
  const variant = variants.find((item) => item.id === variantId);
  const salePrice = variant?.salePrice && variant.salePrice < variant.price ? variant.salePrice : variant?.price ?? product.price;
  const wholesalePrice = variant?.wholesalePrice ?? product.wholesalePrice;
  const wholesaleActive = (!!user?.isWholesaleCustomer || existingCartQuantity + quantity >= WHOLESALE_MIN_QTY) && wholesalePrice != null && wholesalePrice > 0 && wholesalePrice < salePrice;
  const price = wholesaleActive ? wholesalePrice : salePrice;
  const stock = variant?.stock ?? product.stock;
  const image = variant?.image || product.image;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const add = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: salePrice,
      wholesalePrice,
      image,
      size: variant?.attributeSummary || size,
      color: variant ? "" : color,
      quantity,
      variantId: variant?.id,
      variantSummary: variant?.attributeSummary,
    });
    toast(`${product.name} added to cart`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-end justify-center bg-navy-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Quick view ${product.name}`} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-800/10 bg-white px-5 py-4">
          <p className="font-semibold text-navy-800">Quick View</p>
          <button type="button" onClick={onClose} aria-label="Close quick view" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-2xl text-navy-800">×</button>
        </div>
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-square bg-navy-50">
            <Image src={image} alt={image === product.image ? product.imageAlt || product.name : `${product.name} variation`} fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" />
            <ProductBadges product={product} />
          </div>
          <div className="p-5 sm:p-8">
            <p className="text-xs font-semibold uppercase text-[#a94700]">{product.category}</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-navy-800 sm:text-3xl">{product.name}</h2>
            <p className="mt-3 text-2xl font-bold text-navy-800">{formatPrice(price)}</p>
            {wholesaleActive && <p className="mt-1 text-xs font-semibold text-emerald-600">Cart-wide bulk price applied</p>}
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-navy-800/65">{product.description}</p>

            {variants.length > 0 ? (
              <div className="mt-6">
                <label htmlFor={`quick-variant-${product.id}`} className="text-sm font-semibold text-navy-800">Variation</label>
                <select id={`quick-variant-${product.id}`} value={variantId} onChange={(event) => { setVariantId(Number(event.target.value)); setQuantity(1); }} className="input mt-2">
                  {variants.map((item) => <option key={item.id} value={item.id} disabled={item.stock < 1}>{item.attributeSummary} - {formatPrice(item.salePrice && item.salePrice < item.price ? item.salePrice : item.price)}{item.stock < 1 ? " (Out of stock)" : ""}</option>)}
                </select>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {product.sizes.length > 0 && <select value={size} onChange={(event) => setSize(event.target.value)} aria-label="Size" className="input">{product.sizes.map((item) => <option key={item}>{item}</option>)}</select>}
                {product.colors.length > 0 && <select value={color} onChange={(event) => setColor(event.target.value)} aria-label="Color" className="input">{product.colors.map((item) => <option key={item}>{item}</option>)}</select>}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <div className="flex items-center rounded-full border border-navy-800/15">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-11 w-10" aria-label="Decrease quantity">−</button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(stock, value + 1))} className="h-11 w-10" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" onClick={add} disabled={stock < 1} className="btn-primary min-w-0 flex-1">{stock < 1 ? "Out of Stock" : "Add to Cart"}</button>
            </div>
            <Link href={`/product/${product.slug}`} onClick={onClose} className="mt-5 block text-center text-sm font-semibold text-navy-800 underline decoration-brand underline-offset-4">View full product details</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
