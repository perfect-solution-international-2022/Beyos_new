"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import CheckoutButton from "./CheckoutButton";

export default function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCart();
  const subtotal = useCart((s) => s.subtotal());

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-navy-800/10 px-4 py-5 sm:px-6">
          <h2 className="text-lg font-bold text-navy-800">
            Your Cart{" "}
            <span className="text-navy-800/40">({items.length})</span>
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy-800 hover:bg-navy-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-50 text-navy-800/40">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-navy-800/60">Your cart is empty.</p>
            <Link href="/shop" onClick={closeCart} className="btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <ul className="divide-y divide-navy-800/10">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="flex gap-4 py-4"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-50"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={80}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <Link
                          href={`/product/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-semibold text-navy-800 hover:text-brand"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() =>
                            removeItem(item.productId, item.size, item.color)
                          }
                          aria-label="Remove item"
                          className="text-navy-800/30 hover:text-brand"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-navy-800/50">
                        {item.size} · {item.color}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-2">
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
                          <span className="w-6 text-center text-sm font-medium">
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
                        <span className="text-sm font-bold text-navy-800">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-navy-800/10 px-4 py-5 sm:px-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-navy-800/60">Subtotal</span>
                <span className="text-lg font-bold text-navy-800">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-navy-800/40">
                Shipping & taxes calculated at checkout.
              </p>
              <CheckoutButton
                className="btn-primary mt-4 w-full"
                onNavigate={closeCart}
              >
                Checkout
              </CheckoutButton>
              <button
                onClick={closeCart}
                className="mt-2 w-full text-center text-sm font-medium text-navy-800/60 hover:text-brand"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
