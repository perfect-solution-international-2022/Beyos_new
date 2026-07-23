"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Promotion {
  id: number;
  code: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  endDate: string | null;
  imageUrl: string | null;
}

function valueLabel(p: Promotion): string {
  if (p.discountType === "percentage") return `${p.discountValue}% OFF`;
  if (p.discountType === "fixed") return `${formatPrice(p.discountValue)} OFF`;
  return "FREE SHIPPING";
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/promotions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPromos(d.promotions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (p: Promotion) => {
    try {
      await navigator.clipboard.writeText(p.code);
    } catch {
      // Clipboard API unavailable (older browser/permissions) — fall back silently,
      // the code is still visible on the card for manual copying.
    }
    setCopied(p.id);
    setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 2000);
  };

  return (
    <div className="bg-navy-50/40">
      <div className="container-x py-14 sm:py-20">
        <div className="text-center">
          <span className="badge bg-brand-50 text-brand-700">Limited Time</span>
          <h1 className="mt-4 font-display text-4xl font-bold text-navy-800 sm:text-5xl">
            Promotions &amp; Offers
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-navy-800/60">
            Grab a code below and apply it at checkout to save on your order.
          </p>
        </div>

        <div className="mt-12">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-56 animate-pulse rounded-3xl bg-navy-800/5" />
              ))}
            </div>
          ) : promos.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {promos.map((p) => (
                <PromoCard key={p.id} promo={p} copied={copied === p.id} onCopy={() => copy(p)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-dashed border-navy-800/15 bg-white px-8 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-800/30">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.5 3H4a1 1 0 0 0-1 1v5.5a2 2 0 0 0 .83 1.5l9.58 9.59a2 2 0 0 0 2.83 0l4.34-4.34a2 2 0 0 0 .01-2.84Z" />
          <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <h2 className="mt-5 text-lg font-bold text-navy-800">No promotions right now</h2>
      <p className="mt-2 text-sm text-navy-800/50">
        There are no active promo codes at the moment. Check back soon — new offers are added regularly.
      </p>
    </div>
  );
}

function PromoCard({ promo, copied, onCopy }: { promo: Promotion; copied: boolean; onCopy: () => void }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-navy-800/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-56 w-full shrink-0 overflow-hidden bg-gradient-to-br from-navy-800 to-navy-900">
        {promo.imageUrl && (
          <Image src={promo.imageUrl} alt={promo.code} fill className="object-cover" />
        )}
        {promo.imageUrl && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy-900/60 to-transparent" />
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">
            {valueLabel(promo)}
          </span>
          {promo.endDate && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-navy-800">
              Ends {new Date(promo.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {promo.description && <p className="text-sm text-navy-800/70">{promo.description}</p>}
        {promo.minOrderAmount && (
          <p className="mt-1.5 text-xs text-navy-800/45">Min. order {formatPrice(promo.minOrderAmount)}</p>
        )}

        <div className="mt-auto pt-5">
          <button
            onClick={onCopy}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition ${
              copied ? "border-emerald-400 bg-emerald-50" : "border-brand/40 bg-brand-50 hover:border-brand"
            }`}
          >
            <span className="font-mono text-base font-bold tracking-wider text-navy-800">{promo.code}</span>
            <span className={`flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase ${copied ? "text-emerald-600" : "text-brand-700"}`}>
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
