"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";

interface OrderStatus {
  orderRef: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
}

function ReturnContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const clearCart = useCart((s) => s.clear);
  const clearedRef = useRef(false);

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!clearedRef.current) {
      clearCart();
      clearedRef.current = true;
    }
  }, [clearCart]);

  useEffect(() => {
    if (!ref) {
      setError("Missing order reference.");
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(ref)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load order");
        if (!cancelled) setOrder(data.order);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load order");
      }
    };

    poll();
    // Poll a few times in case a webhook/admin confirmation flips payment_status
    // while the customer is looking at this page.
    const interval = setInterval(() => {
      setAttempts((a) => {
        if (a >= 6) {
          clearInterval(interval);
          return a;
        }
        poll();
        return a + 1;
      });
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ref]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-navy-800/10 bg-white p-10 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold text-navy-800">
          We couldn&apos;t find that order
        </h1>
        <p className="mt-3 text-navy-800/60">{error}</p>
        <Link href="/dashboard/orders" className="btn-primary mt-8">
          View My Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-navy-800/10 bg-white p-10 text-center shadow-sm">
        <p className="text-navy-800/50">Loading your order…</p>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "paid";

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-navy-800/10 bg-white p-10 text-center shadow-sm">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        }`}
      >
        {isPaid ? (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold text-navy-800">
        {isPaid ? "Payment Received!" : "Confirming Your Payment"}
      </h1>
      <p className="mt-3 text-navy-800/60">
        {isPaid
          ? "Thank you for shopping with Beyos. Your order is confirmed."
          : "We're verifying your payment with OnePay. This page will update automatically — you can also check back in your order history shortly."}
      </p>

      <div className="mt-6 space-y-2 rounded-2xl bg-navy-50 p-5 text-sm">
        <div className="flex justify-between">
          <span className="text-navy-800/60">Order ID</span>
          <span className="font-bold text-navy-800">{order.orderRef}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy-800/60">Amount</span>
          <span className="font-bold text-navy-800">{formatPrice(order.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy-800/60">Payment Status</span>
          <span className={`badge capitalize ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/dashboard/orders" className="btn-outline flex-1">
          View My Orders
        </Link>
        <Link href="/shop" className="btn-primary flex-1">
          Continue Shopping
        </Link>
      </div>

      {!isPaid && (
        <p className="mt-4 text-xs text-navy-800/40">
          Paid but still shows pending? Contact us with your Order ID and we&apos;ll confirm it right away.
        </p>
      )}
    </div>
  );
}

export default function OnepayReturnPage() {
  return (
    <div className="container-x py-20">
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg rounded-3xl border border-navy-800/10 bg-white p-10 text-center shadow-sm">
            <p className="text-navy-800/50">Loading…</p>
          </div>
        }
      >
        <ReturnContent />
      </Suspense>
    </div>
  );
}
