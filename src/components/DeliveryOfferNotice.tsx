"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isDeliveryOfferActive, type DeliveryChannel, type DeliveryOffer } from "@/lib/delivery-offer";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
export default function DeliveryOfferNotice({ channel = "website", items, appliedName, announcement = false }: { announcement?: boolean; channel?: DeliveryChannel; items?: { slug: string; quantity: number }[]; appliedName?: string | null }) {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [now, setNow] = useState(Date.now());
  const cart = useCart(s => s.items);
  const pathname = usePathname();
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = () => fetch("/api/shipping/offer", { cache: "no-store" }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (active) { setOffer(d.offer); setNow(Date.now()); } }).catch(() => { if (active) setOffer(null); });
    refresh(); const timer = window.setInterval(refresh, 30000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(tick); };
  }, [pathname]);
  if (!offer || !isDeliveryOfferActive(offer, channel, now)) return null;
  if (announcement) {
    const tiers = offer.tiers;
    return <aside aria-label="Delivery offers" className="border-b border-[#ff891e]/25 bg-[#0d263d] text-white"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false); }}>
      <div className="relative flex min-h-9 items-center pr-9">
        <div className="delivery-ticker-window flex-1 overflow-hidden py-2">
          <div className="delivery-ticker-track flex w-max text-[11px] font-medium tracking-wide sm:text-xs" style={{ animationPlayState: paused || hovered ? "paused" : "running", animationDuration: `${Math.max(28, tiers.length * 10)}s` }}>
            {[0, 1].map(copy => <div key={copy} aria-hidden={copy === 1 ? true : undefined} className="delivery-ticker-group flex shrink-0 items-center justify-around gap-10 whitespace-nowrap px-5 sm:gap-16 sm:px-8">
              {tiers.map((tier,index) => {
                const next = tiers[index + 1];
                const count = next ? (next.quantity === tier.quantity + 1 ? `${tier.quantity}` : `${tier.quantity}–${next.quantity - 1}`) : `${tier.quantity}+`;
                return <p key={tier.quantity} className="flex shrink-0 items-center">
                  <span aria-hidden="true" className="mr-5 text-[#ffad66] sm:mr-8">✦</span>
                  Buy {count} {tier.quantity === 1 && next?.quantity === 2 ? "item" : "items"}<span className="mx-2 text-white/35">·</span>
                  <span className="font-semibold text-[#ffad66]">{tier.fee === 0 ? "FREE delivery" : `Delivery ${formatPrice(tier.fee)}`}</span>
                  {offer.productSlugs.length > 0 && <span className="ml-2 text-white/70">(selected products)</span>}
                </p>;
              })}
            </div>)}
          </div>
        </div>
        {!reduceMotion && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? "Play delivery offers" : "Pause delivery offers"} aria-pressed={paused} className="absolute right-2 flex h-7 w-7 items-center justify-center rounded text-white/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffad66]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">{paused ? <path d="M2 1 9 5 2 9Z" /> : <path d="M2 1h2v8H2zM6 1h2v8H6z" />}</svg>
        </button>}
      </div>
    </aside>;
  }
  const lines = items ?? (channel === "website" ? cart : []);
  const quantity = lines.reduce((sum,line) => sum + (!offer.productSlugs.length || offer.productSlugs.includes(line.slug) ? line.quantity : 0), 0);
  const freeTier = offer.tiers.find(t => t.fee === 0);
  return <aside className="border-y border-orange-200 bg-orange-50 px-4 py-3 text-center text-sm text-navy-800" aria-label="Delivery offer">
    <strong>{offer.name}</strong>{offer.description && <span> · {offer.description}</span>}
    <p className="mt-1">{offer.tiers.map((t,i) => `${offer.tiers[i+1] ? (offer.tiers[i+1].quantity === t.quantity+1 ? t.quantity : `${t.quantity}–${offer.tiers[i+1].quantity-1}`) : `${t.quantity}+`} items: ${t.fee === 0 ? "FREE delivery" : `${formatPrice(t.fee)} delivery`}`).join(" · ")}</p>
    {offer.productSlugs.length > 0 && <p className="mt-1 text-xs">Selected products only: {offer.productSlugs.map((slug,i) => <span key={slug}>{i > 0 && ", "}<a className="underline" href={`/product/${slug}`}>{slug.replace(/-/g," ")}</a></span>)}. Eligible units count towards delivery for the whole order.</p>}
    {appliedName && <p className="mt-1 font-semibold">Delivery offer applied: {appliedName}</p>}
    {quantity > 0 && freeTier && quantity < freeTier.quantity && <p className="mt-1 font-semibold">Add {freeTier.quantity-quantity} more eligible {freeTier.quantity-quantity === 1 ? "item" : "items"} for FREE delivery!</p>}
    {quantity >= (freeTier?.quantity ?? Infinity) && <p className="mt-1 font-semibold">Your items qualify for FREE delivery.</p>}
  </aside>;
}
