"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import CheckoutButton from "@/components/CheckoutButton";

const FREE_SHIPPING_THRESHOLD = 10000;

export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, updateQuantity, promoCode, setPromoCode } = useCart();
  const subtotal = useCart((s) => s.subtotal());

  const [promoInput, setPromoInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [freeShippingPromo, setFreeShippingPromo] = useState(false);
  const [shipping, setShipping] = useState(0);

  useEffect(() => setMounted(true), []);

  // Re-validate the stored promo code whenever the cart contents change —
  // a code that qualified before might not (min order amount, etc.) now.
  useEffect(() => {
    if (!promoCode || subtotal === 0) {
      setDiscount(0);
      setFreeShippingPromo(false);
      return;
    }
    let cancelled = false;
    fetch("/api/promotions/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.valid) {
          setDiscount(d.subtotalDiscount);
          setFreeShippingPromo(d.freeShipping);
          setPromoError("");
        } else {
          setDiscount(0);
          setFreeShippingPromo(false);
          setPromoError(d.error || "This promo code no longer applies");
        }
      })
      .catch(() => {
        if (!cancelled) setPromoError("Could not verify promo code");
      });
    return () => {
      cancelled = true;
    };
  }, [promoCode, subtotal]);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setApplying(true);
    setPromoError("");
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!data.valid) throw new Error(data.error || "Invalid promo code");
      setPromoCode(data.code);
      setDiscount(data.subtotalDiscount);
      setFreeShippingPromo(data.freeShipping);
      setPromoInput("");
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Invalid promo code");
    } finally {
      setApplying(false);
    }
  };

  const removePromo = () => {
    setPromoCode(null);
    setDiscount(0);
    setFreeShippingPromo(false);
    setPromoError("");
  };

  const discountedSubtotal = Math.max(0, subtotal - discount);

  // Weight-based shipping is computed server-side (admin-configured pricing).
  useEffect(() => {
    if (subtotal === 0) {
      setShipping(0);
      return;
    }
    let cancelled = false;
    fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ slug: i.slug, quantity: i.quantity, variantId: i.variantId })),
        discountedSubtotal,
        freeShipping: freeShippingPromo,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setShipping(Number(d.shipping) || 0);
      })
      .catch(() => {
        if (!cancelled) setShipping(0);
      });
    return () => {
      cancelled = true;
    };
  }, [items, subtotal, discountedSubtotal, freeShippingPromo]);

  const total = discountedSubtotal + shipping;

  if (!mounted) {
    return (
      <div className="container-x py-20 text-center text-navy-800/50">
        Loading cart…
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-3xl font-bold text-navy-800 sm:text-4xl">
        Shopping Cart
      </h1>

      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-5 rounded-3xl bg-navy-50 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-navy-800/40">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-navy-800">
              Your cart is empty
            </p>
            <p className="mt-1 text-navy-800/60">
              Looks like you haven&apos;t added anything yet.
            </p>
          </div>
          <Link href="/shop" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <div>
            <ul className="divide-y divide-navy-800/10 border-y border-navy-800/10">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-3 py-5 sm:gap-4"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-50 sm:h-32 sm:w-24"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={96}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-col gap-1 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between min-[380px]:gap-4">
                      <div>
                        <Link
                          href={`/product/${item.slug}`}
                          className="font-semibold text-navy-800 hover:text-brand"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-sm text-navy-800/50">
                          {item.size} · {item.color}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-navy-800 min-[380px]:text-base">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-col items-start gap-2 pt-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
                      <div className="flex items-center rounded-full border border-navy-800/15">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.size,
                              item.color,
                              item.quantity - 1
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center text-navy-800 hover:text-brand"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.size,
                              item.color,
                              item.quantity + 1
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center text-navy-800 hover:text-brand"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() =>
                          removeItem(item.productId, item.size, item.color)
                        }
                        className="text-sm font-medium text-navy-800/50 hover:text-brand"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-brand"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-navy-800/10 bg-navy-50 p-4 sm:p-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-bold text-navy-800">Order Summary</h2>

            {/* Promo code */}
            <div className="mt-4">
              {promoCode ? (
                <div className="flex items-center justify-between rounded-lg border border-brand/30 bg-brand-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
                      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" />
                      <circle cx="7.5" cy="7.5" r="1.5" />
                    </svg>
                    <span className="font-mono text-sm font-semibold text-brand-700">{promoCode}</span>
                  </div>
                  <button onClick={removePromo} className="text-xs font-medium text-navy-800/50 hover:text-red-500">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyPromo(); } }}
                    placeholder="Promo code"
                    className="input flex-1 font-mono uppercase"
                  />
                  <button
                    onClick={applyPromo}
                    disabled={applying || !promoInput.trim()}
                    className="btn-outline shrink-0 disabled:opacity-40"
                  >
                    {applying ? "…" : "Apply"}
                  </button>
                </div>
              )}
              {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-800/60">Subtotal</dt>
                <dd className="font-semibold text-navy-800">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount</dt>
                  <dd className="font-semibold">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-navy-800/60">Shipping</dt>
                <dd className="font-semibold text-navy-800">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </dd>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-navy-800/50">
                  Add {formatPrice(FREE_SHIPPING_THRESHOLD - discountedSubtotal)} more for
                  free shipping.
                </p>
              )}
              <div className="flex justify-between border-t border-navy-800/10 pt-4 text-base">
                <dt className="font-bold text-navy-800">Total</dt>
                <dd className="font-bold text-navy-800">{formatPrice(total)}</dd>
              </div>
            </dl>
            <CheckoutButton className="btn-primary mt-6 w-full">
              Proceed to Checkout
            </CheckoutButton>
            <p className="mt-3 text-center text-xs text-navy-800/40">
              Secure checkout · Encrypted payment
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
