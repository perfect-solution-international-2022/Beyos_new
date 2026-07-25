"use client";

import { useEffect, useRef, useState } from "react";

const highlights = [
  { title: "Island-wide Delivery", description: "Reliable delivery across Sri Lanka", icon: "globe" },
  { title: "Premium Quality", description: "Carefully selected fabrics for lasting comfort", icon: "quality" },
  { title: "Secure Payments", description: "Safe and protected checkout you can trust", icon: "payment" },
  { title: "Easy Returns", description: "Simple support when something is not right", icon: "returns" },
  { title: "Cash on Delivery", description: "Pay when your order arrives at your doorstep", icon: "cash" },
  { title: "Order Tracking", description: "Follow your delivery from dispatch to arrival", icon: "truck" },
  { title: "Custom Printing", description: "Bring your own T-shirt designs to life", icon: "shirt" },
  { title: "Low Minimum Orders", description: "Order the quantity that works for you", icon: "box" },
  { title: "WhatsApp Support", description: "Friendly help when you need an answer", icon: "chat" },
  { title: "Inclusive Sizes", description: "Comfortable fits for different body types", icon: "ruler" },
];

export default function ServiceHighlights() {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  const slideWidth = () => {
    const track = trackRef.current;
    const firstSlide = track?.firstElementChild as HTMLElement | null;
    if (!track || !firstSlide) return 0;
    const styles = window.getComputedStyle(track);
    return firstSlide.getBoundingClientRect().width + Number.parseFloat(styles.columnGap || styles.gap || "0");
  };

  const goTo = (index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    const width = slideWidth();
    if (!track || !width) return;
    activeIndexRef.current = index;
    track.scrollTo({ left: index * width, behavior });
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || reducedMotion.matches) return;

    const interval = window.setInterval(() => {
      const nextIndex = activeIndexRef.current + 1;
      goTo(nextIndex);

      if (nextIndex === highlights.length) {
        resetTimerRef.current = setTimeout(() => goTo(0, "auto"), 650);
      }
    }, 3500);

    return () => {
      window.clearInterval(interval);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [paused]);

  const syncIndexAfterInteraction = () => {
    const width = slideWidth();
    const track = trackRef.current;
    if (!track || !width) return;
    const rawIndex = Math.round(track.scrollLeft / width);
    const normalizedIndex = rawIndex % highlights.length;
    activeIndexRef.current = normalizedIndex;
    if (rawIndex >= highlights.length) goTo(normalizedIndex, "auto");
  };

  const carouselItems = [...highlights, ...highlights];

  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl border border-navy-800/10 bg-[#f7f7f6] sm:mx-4 lg:mx-6" aria-label="Store services">
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Beyos store services"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => {
          syncIndexAfterInteraction();
          setPaused(false);
        }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => {
          syncIndexAfterInteraction();
          setPaused(false);
        }}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth no-scrollbar"
      >
          {carouselItems.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              aria-hidden={index >= highlights.length}
              className="flex min-h-[142px] w-1/2 shrink-0 snap-start flex-col items-center justify-center gap-2 border-r border-navy-800/10 px-3 py-4 text-center sm:min-h-[124px] sm:flex-row sm:justify-start sm:gap-4 sm:px-6 sm:py-5 sm:text-left lg:w-1/4 lg:px-8 lg:py-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8e6e2] text-navy-900 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                <HighlightIcon name={item.icon} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold uppercase leading-4 text-navy-900 min-[380px]:text-xs sm:text-sm">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-navy-800/65 min-[380px]:text-[11px] sm:text-xs lg:text-sm">{item.description}</p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

function HighlightIcon({ name }: { name: string }) {
  const props = { width: 31, height: 31, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "globe") return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
  if (name === "quality") return <svg {...props}><circle cx="12" cy="10" r="6" /><path d="m9.5 10 1.6 1.6 3.4-3.5M8 15.5 6.5 22l5.5-3 5.5 3-1.5-6.5" /></svg>;
  if (name === "payment") return <svg {...props}><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M3 9h18M15 14h3M17 16v5M15 19h4" /></svg>;
  if (name === "returns") return <svg {...props}><path d="M7 7h10l3 3-8 5-8-5 3-3ZM4 10v7l8 4 8-4v-7M12 15v6" /><path d="M7 4 4 7l3 3M17 4l3 3-3 3" /></svg>;
  if (name === "cash") return <svg {...props}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M7 9H5v2M17 15h2v-2" /></svg>;
  if (name === "truck") return <svg {...props}><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
  if (name === "shirt") return <svg {...props}><path d="m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3c-.6 1.3-2 2-4 2s-3.4-.7-4-2Z" /></svg>;
  if (name === "box") return <svg {...props}><path d="m4 7 8-4 8 4-8 4-8-4ZM4 7v10l8 4 8-4V7M12 11v10" /></svg>;
  if (name === "chat") return <svg {...props}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.2A8.3 8.3 0 1 1 21 11.5Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" /></svg>;
  return <svg {...props}><path d="M4 16 16 4l4 4L8 20H4v-4Z" /><path d="m11 9 2 2m1-5 2 2m-8 4 2 2m-5 1 2 2" /></svg>;
}
