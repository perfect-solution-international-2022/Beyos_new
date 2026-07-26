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
      className="hero-shell relative mx-2 mt-2 h-[74svh] min-h-[540px] max-h-[860px] overflow-hidden rounded-[26px] bg-[#07192d] sm:mx-4 sm:mt-3 sm:rounded-[32px] lg:mx-6"
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

      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#03101f]/100 via-[#061629]/78 to-[#061629]/15" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#061629]/85 via-transparent to-[#061629]/20" />
      <div className="absolute inset-y-0 left-[54%] z-[2] hidden w-px bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" />

      <div className="container-x relative z-10 flex h-full items-center pb-16 pt-8 sm:pb-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white/85 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> New season · Sri Lanka
          </span>
          <h1 className="mt-6 max-w-2xl font-display text-[46px] font-bold leading-[0.96] tracking-[-0.04em] text-white [text-shadow:0_3px_28px_rgba(0,0,0,.55)] min-[390px]:text-[54px] sm:text-7xl lg:text-[88px]">
            Made to move.<br/><span className="font-normal italic text-brand">Designed to stay.</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-6 text-white/68 sm:text-lg sm:leading-8">Contemporary essentials, effortless fits and premium comfort—made for every version of your day.</p>

          <div className="mt-8 flex flex-col gap-3 min-[360px]:flex-row">
            <Link href="/shop" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#a94700] px-7 py-3.5 text-sm font-bold text-white shadow-[0_12px_35px_rgba(169,71,0,.3)] transition hover:-translate-y-0.5 hover:bg-[#c25300]">Shop collection <span className="transition-transform group-hover:translate-x-1">→</span></Link>
            <Link href="/about" className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/[0.06] px-7 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/10">Discover Beyos</Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            <span className="flex items-center gap-2"><CheckIcon /> Premium quality</span>
            <span className="flex items-center gap-2"><CheckIcon /> Island-wide delivery</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 z-10 flex items-end justify-between gap-5 sm:inset-x-9 sm:bottom-7">
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

        {slides.length > 1 && <div className="flex gap-2"><NavButton label="Previous slide" direction="left" onClick={() => move(-1)} /><NavButton label="Next slide" direction="right" onClick={() => move(1)} /></div>}
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
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white hover:text-navy-800"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"}/></svg></button>;
}

function CheckIcon() {
  return <span className="flex h-4 w-4 items-center justify-center rounded-full border border-brand/60 text-brand"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 6 2.5 2.5L10 3"/></svg></span>;
}
