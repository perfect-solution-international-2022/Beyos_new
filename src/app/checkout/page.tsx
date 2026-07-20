"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";

const FREE_SHIPPING_THRESHOLD = 10000;
const SHIPPING_FEE = 500;

interface OrderResult {
  orderId: string;
  total: number;
  discount: number;
  estimatedDelivery: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { items, clear, promoCode } = useCart();
  const subtotal = useCart((s) => s.subtotal());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "onepay">("cod");

  const [discount, setDiscount] = useState(0);
  const [freeShippingPromo, setFreeShippingPromo] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  useEffect(() => setMounted(true), []);

  // Auth guard — only logged-in users can check out.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [authLoading, user, router]);

  // Prefill from the signed-in account.
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        email: f.email || user.email,
      }));
    }
  }, [user]);

  // Re-validate the promo code carried over from the cart for an accurate preview.
  useEffect(() => {
    if (!promoCode || subtotal === 0) {
      setDiscount(0);
      setFreeShippingPromo(false);
      return;
    }
    fetch("/api/promotions/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, subtotal }),
    })
      .then((r) => r.json())
      .then((d) => {
        setDiscount(d.valid ? d.subtotalDiscount : 0);
        setFreeShippingPromo(d.valid ? d.freeShipping : false);
      })
      .catch(() => {
        setDiscount(0);
        setFreeShippingPromo(false);
      });
  }, [promoCode, subtotal]);

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping =
    subtotal === 0 || freeShippingPromo || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_FEE;
  const total = discountedSubtotal + shipping;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body = JSON.stringify({
        customer: form,
        items: items.map((i) => ({
          slug: i.slug,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
        })),
        promoCode: promoCode || undefined,
      });

      if (paymentMethod === "onepay") {
        const res = await fetch("/api/checkout/onepay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start card payment");
        // Hand off to OnePay's hosted checkout page. Cart is cleared on the
        // return page once we're back, so an abandoned payment doesn't lose it.
        window.location.href = data.redirectUrl;
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      setOrder({
        orderId: data.order.orderId,
        total: data.order.total,
        discount: data.order.discount || 0,
        estimatedDelivery: data.order.estimatedDelivery,
      });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (!mounted || authLoading || !user) {
    return (
      <div className="container-x py-20 text-center text-navy-800/50">
        Loading checkout…
      </div>
    );
  }

  // Order confirmation
  if (order) {
    return (
      <div className="container-x py-20">
        <div className="mx-auto max-w-lg rounded-3xl border border-navy-800/10 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-navy-800">
            Order Confirmed!
          </h1>
          <p className="mt-3 text-navy-800/60">
            Thank you for shopping with Beyos. A confirmation has been sent to
            your email.
          </p>
          <div className="mt-6 space-y-2 rounded-2xl bg-navy-50 p-5 text-sm">
            <div className="flex justify-between">
              <span className="text-navy-800/60">Order ID</span>
              <span className="font-bold text-navy-800">{order.orderId}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount Applied</span>
                <span className="font-bold">−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-navy-800/60">Total Paid</span>
              <span className="font-bold text-navy-800">
                {formatPrice(order.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-800/60">Estimated Delivery</span>
              <span className="font-bold text-navy-800">
                {order.estimatedDelivery}
              </span>
            </div>
          </div>
          <Link href="/shop" className="btn-primary mt-8 w-full">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Empty cart guard
  if (items.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-navy-800">
          Your cart is empty
        </h1>
        <p className="mt-3 text-navy-800/60">
          Add some products before checking out.
        </p>
        <Link href="/shop" className="btn-primary mt-8">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-3xl font-bold text-navy-800 sm:text-4xl">Checkout</h1>

      <form
        onSubmit={submit}
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        {/* Details */}
        <div>
          <h2 className="text-lg font-bold text-navy-800">
            Shipping Information
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Full Name
              </label>
              <input
                required
                value={form.name}
                onChange={update("name")}
                className="input"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={update("email")}
                className="input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Phone
              </label>
              <input
                required
                value={form.phone}
                onChange={update("phone")}
                className="input"
                placeholder="+94 7X XXX XXXX"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Address
              </label>
              <input
                required
                value={form.address}
                onChange={update("address")}
                className="input"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                City
              </label>
              <input
                required
                value={form.city}
                onChange={update("city")}
                className="input"
                placeholder="City"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Postal Code
              </label>
              <input
                value={form.postalCode}
                onChange={update("postalCode")}
                className="input"
                placeholder="Postal code"
              />
            </div>
          </div>

          <h2 className="mt-10 text-lg font-bold text-navy-800">Payment</h2>
          <div className="mt-4 space-y-3">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 text-sm transition ${
                paymentMethod === "cod"
                  ? "border-brand bg-brand-50"
                  : "border-navy-800/10 hover:border-navy-800/20"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                className="mt-0.5"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-navy-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Cash on Delivery
                </div>
                <p className="mt-1 text-navy-800/60">Pay in cash when your order arrives.</p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-5 text-sm transition ${
                paymentMethod === "onepay"
                  ? "border-brand bg-brand-50"
                  : "border-navy-800/10 hover:border-navy-800/20"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === "onepay"}
                onChange={() => setPaymentMethod("onepay")}
                className="mt-0.5"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-navy-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="1" y="5" width="22" height="15" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                    <path d="M6 15h4" />
                  </svg>
                  Pay by Card
                </div>
                <p className="mt-1 text-navy-800/60">
                  Secure card payment via OnePay. You&apos;ll be redirected to complete payment.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-navy-800/10 bg-white p-4 sm:p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold text-navy-800">Your Order</h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.size}-${item.color}`}
                className="flex gap-3"
              >
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={56}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-800 px-1 text-[11px] font-bold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-navy-800">
                    {item.name}
                  </span>
                  <span className="text-xs text-navy-800/50">
                    {item.size} · {item.color}
                  </span>
                </div>
                <span className="text-sm font-semibold text-navy-800">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 border-t border-navy-800/10 pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-800/60">Subtotal</dt>
              <dd className="font-semibold text-navy-800">
                {formatPrice(subtotal)}
              </dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt className="flex items-center gap-1.5">
                  Discount
                  {promoCode && <span className="font-mono text-xs text-emerald-500">({promoCode})</span>}
                </dt>
                <dd className="font-semibold">−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-navy-800/60">Shipping</dt>
              <dd className="font-semibold text-navy-800">
                {shipping === 0 ? "Free" : formatPrice(shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-navy-800/10 pt-3 text-base">
              <dt className="font-bold text-navy-800">Total</dt>
              <dd className="font-bold text-navy-800">{formatPrice(total)}</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary mt-6 w-full"
          >
            {submitting
              ? paymentMethod === "onepay"
                ? "Redirecting to OnePay…"
                : "Placing Order…"
              : paymentMethod === "onepay"
                ? "Continue to Payment"
                : "Place Order"}
          </button>
          <p className="mt-3 text-center text-xs text-navy-800/40">
            🔒 Secure, encrypted checkout
          </p>
        </aside>
      </form>
    </div>
  );
}
