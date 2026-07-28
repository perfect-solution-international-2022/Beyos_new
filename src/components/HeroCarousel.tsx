"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/hero-slides";

const SLIDE_MS = 3000;

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setTimeout(() => setCurrent((value) => (value + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [current, slides.length]);

  if (!slides.length) return null;
  const move = (direction: number) => setCurrent((value) => (value + direction + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Beyos featured collection"
      className="hero-shell premium-dark relative mx-2 mt-2 h-[min(68svh,540px)] min-h-[500px] overflow-hidden rounded-[26px] bg-navy-900 ring-1 ring-white/10 sm:mx-4 sm:mt-3 sm:h-[74svh] sm:min-h-[540px] sm:max-h-[860px] sm:rounded-[32px] lg:mx-6"
    >
      {slides.map((slide, index) => (
        <div key={slide.id} aria-hidden={index !== current} className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${index === current ? "z-0 opacity-100" : "pointer-events-none opacity-0"}`}>
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "low"}
            quality={75}
            sizes="100vw"
            className={`object-cover transition-transform duration-[8000ms] ease-out ${index === current ? "scale-[1.045]" : "scale-100"}`}
          />
        </div>
      ))}

      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-navy-900 via-navy-900/80 to-navy-900/15" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-navy-900/85 via-transparent to-navy-900/20" />
      <div className="absolute -right-24 -top-32 z-[2] h-80 w-80 rounded-full border border-white/10 bg-white/[0.04] blur-[1px]" />
      <div className="absolute inset-x-12 top-0 z-[3] h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="absolute inset-y-0 left-[54%] z-[2] hidden w-px bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" />

      <div className="container-x relative z-10 flex h-full items-center pb-14 pt-3 sm:pb-20 sm:pt-8">
        <div className="glass-edge max-w-3xl rounded-[24px] border border-white/15 bg-navy-900/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_28px_70px_rgba(0,0,0,.18)] backdrop-blur-[3px] sm:rounded-[28px] sm:p-7 lg:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur-md sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.24em]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" /> New season · Sri Lanka
          </span>
          <h1 className="mt-4 max-w-2xl font-display text-[40px] font-bold leading-[0.94] tracking-[-0.04em] text-white [text-shadow:0_3px_28px_rgba(0,0,0,.55)] min-[390px]:text-[44px] sm:mt-6 sm:text-7xl sm:leading-[0.96] lg:text-[88px]">
            Made to move.<br/><span className="font-normal italic text-brand-400">Designed to stay.</span>
          </h1>
          <p className="mt-4 max-w-xl text-xs font-medium leading-5 text-white [text-shadow:0_2px_14px_rgba(0,0,0,.8)] sm:mt-6 sm:text-lg sm:leading-8">Contemporary essentials, effortless fits and premium comfort—made for every version of your day.</p>

          <div className="mt-5 flex flex-col gap-2.5 min-[360px]:flex-row sm:mt-8 sm:gap-3">
            <Link href="/shop" className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-xs font-bold text-white shadow-[0_12px_35px_rgba(116,56,23,.3)] transition hover:-translate-y-0.5 hover:bg-brand-700 sm:gap-3 sm:px-7 sm:py-3.5 sm:text-sm">Shop collection <span className="transition-transform group-hover:translate-x-1">→</span></Link>
            <Link href="/about" className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-4 py-3 text-xs font-bold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/10 sm:px-7 sm:py-3.5 sm:text-sm">Discover Beyos</Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45 sm:mt-9 sm:gap-x-6 sm:text-[10px] sm:tracking-[0.16em]">
            <span className="flex items-center gap-2"><CheckIcon /> Premium quality</span>
            <span className="flex items-center gap-2"><CheckIcon /> Island-wide delivery</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-3 z-10 flex items-end justify-between gap-2 sm:inset-x-9 sm:bottom-7 sm:gap-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-sm">
          <span className="w-6 text-xs font-bold tabular-nums text-white">{String(current + 1).padStart(2, "0")}</span>
          <div className="flex flex-1 gap-1.5">
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" onClick={() => setCurrent(index)} aria-label={`Show slide ${index + 1}`} aria-current={index === current ? "true" : undefined} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                {index === current && <span key={current} className="hero-progress absolute inset-y-0 left-0 rounded-full bg-brand" />}
                {index < current && <span className="absolute inset-0 rounded-full bg-white/55" />}
              </button>
            ))}
          </div>
          <span className="w-6 text-right text-xs font-bold tabular-nums text-white/45">{String(slides.length).padStart(2, "0")}</span>
        </div>

        {slides.length > 1 && <div className="flex shrink-0 gap-1.5 sm:gap-2"><NavButton label="Previous slide" direction="left" onClick={() => move(-1)} /><NavButton label="Next slide" direction="right" onClick={() => move(1)} /></div>}
      </div>

      <style jsx>{`
        .hero-progress { width: 100%; transform-origin: left; animation: heroFill ${SLIDE_MS}ms linear forwards; }
        @keyframes heroFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) { .hero-progress { animation: none; } }
      `}</style>
    </section>
  );
}

function NavButton({ label, direction, onClick }: { label: string; direction: "left" | "right"; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white hover:text-navy-800 sm:h-11 sm:w-11"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}/></svg></button>;
}

function CheckIcon() {
  return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-400/60 text-brand-400"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 6 2.5 2.5L10 3"/></svg></span>;
}
