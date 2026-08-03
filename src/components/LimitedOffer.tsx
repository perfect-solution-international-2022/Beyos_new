"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomepagePromotion } from "@/lib/promotions";
import { formatPrice } from "@/lib/utils";

function offerLabel(promotion: HomepagePromotion) {
  if (promotion.discountType === "percentage") return `${promotion.discountValue}% off`;
  if (promotion.discountType === "fixed") return `${formatPrice(promotion.discountValue)} off`;
  return "Free delivery";
}

function remaining(endDate: string) {
  const milliseconds = Math.max(0, new Date(endDate).getTime() - Date.now());
  return {
    expired: milliseconds <= 0,
    days: Math.floor(milliseconds / 86_400_000),
    hours: Math.floor((milliseconds / 3_600_000) % 24),
    minutes: Math.floor((milliseconds / 60_000) % 60),
    seconds: Math.floor((milliseconds / 1_000) % 60),
  };
}

export default function LimitedOffer({ promotions }: { promotions: HomepagePromotion[] }) {
  const [current, setCurrent] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const promotion = promotions[current] ?? promotions[0];
  const [time, setTime] = useState(() => promotion.endDate ? remaining(promotion.endDate) : null);

  useEffect(() => {
    if (promotions.length < 2) return;
    const timer = window.setInterval(() => setCurrent((value) => (value + 1) % promotions.length), 6000);
    return () => window.clearInterval(timer);
  }, [promotions.length]);

  useEffect(() => {
    if (!promotion.endDate) { setTime(null); return; }
    const update = () => setTime(remaining(promotion.endDate!));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [promotion.endDate]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(promotion.code);
    } catch {
      const input = document.createElement("textarea");
      input.value = promotion.code;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopiedCode(promotion.code);
    window.setTimeout(() => setCopiedCode((code) => code === promotion.code ? null : code), 1800);
  };

  if (time?.expired) return null;

  return (
    <section className="container-x mt-20" aria-labelledby="limited-offer-title">
      <div key={promotion.id} className="premium-dark glass-edge relative grid min-h-[300px] overflow-hidden rounded-2xl bg-navy-900 text-white ring-1 ring-white/10 md:grid-cols-[1fr_40%]">
        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
          <p className="text-xs font-bold uppercase text-brand-400 sm:text-sm">Limited-time offer</p>
          <h2 id="limited-offer-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">{offerLabel(promotion)}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">{promotion.description || "Save on your next Beyos order while this offer is active."}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={copyCode} title="Copy promo code" className="group inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 font-mono text-sm font-bold tracking-wide transition hover:border-brand-400 hover:bg-white/15">
              <span>{promotion.code}</span>
              <CopyIcon />
              <span className="font-sans text-[10px] uppercase tracking-normal text-white/65">{copiedCode === promotion.code ? "Copied!" : "Copy"}</span>
            </button>
            {promotion.minOrderAmount && <span className="text-xs text-white/60">Minimum order {formatPrice(promotion.minOrderAmount)}</span>}
          </div>
          {time ? (
            <div className="mt-6 flex gap-2" aria-label={`${time.days} days ${time.hours} hours ${time.minutes} minutes remaining`}>
              <TimePart value={time.days} label="Days" />
              <TimePart value={time.hours} label="Hours" />
              <TimePart value={time.minutes} label="Mins" />
              <TimePart value={time.seconds} label="Secs" />
            </div>
          ) : <p className="mt-6 text-sm font-semibold text-brand-400">Available while the promotion is active</p>}
          <Link href="/shop" className="btn-primary mt-7 w-fit">Shop the offer</Link>
        </div>
        <div className="relative min-h-[220px] bg-[#f1efec] md:min-h-full">
          <Image src={promotion.imageUrl || "/images/about/about-image.jpeg"} alt={promotion.description || `${promotion.code} promotion`} fill sizes="(max-width: 767px) 100vw, 40vw" className="object-cover" priority={current === 0} />
        </div>
        {promotions.length > 1 && (
          <div className="absolute inset-x-4 bottom-3 z-10 flex items-center justify-center gap-2 md:inset-x-auto md:bottom-5 md:right-5">
            <button type="button" onClick={() => setCurrent((current - 1 + promotions.length) % promotions.length)} aria-label="Previous promotion" className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-navy-900/65 text-white backdrop-blur hover:bg-navy-900">‹</button>
            {promotions.map((item, index) => <button key={item.id} type="button" onClick={() => setCurrent(index)} aria-label={`Show promotion ${index + 1}`} aria-current={index === current} className={`h-2 rounded-full transition-all ${index === current ? "w-7 bg-brand-400" : "w-2 bg-white/55 hover:bg-white"}`} />)}
            <button type="button" onClick={() => setCurrent((current + 1) % promotions.length)} aria-label="Next promotion" className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-navy-900/65 text-white backdrop-blur hover:bg-navy-900">›</button>
          </div>
        )}
      </div>
    </section>
  );
}

function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}

function TimePart({ value, label }: { value: number; label: string }) {
  return <span className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-white/15 bg-white/10"><strong className="text-lg leading-none">{String(value).padStart(2, "0")}</strong><small className="mt-1 text-[9px] uppercase text-white/60">{label}</small></span>;
}
