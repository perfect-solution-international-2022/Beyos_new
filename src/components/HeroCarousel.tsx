"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/hero-slides";

const SLIDE_MS = 6000;

// Fixed hero content — stays in place while only the background images rotate.
const content = {
  eyebrow: "The new Beyos edit",
  subtitle:
    "Timeless pieces, crafted to last. Discover the new Beyos collection for men and women.",
  cta: "Explore collection",
  href: "/shop",
};

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // One timer per slide (recreated on change) so a manual pick also gets a full interval.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(
      () => setCurrent((c) => (c + 1) % slides.length),
      SLIDE_MS
    );
    return () => clearTimeout(id);
  }, [current, paused, slides.length]);

  return (
    <section
      className={`relative mx-2 mt-2 h-[72svh] min-h-[520px] max-h-[820px] overflow-hidden rounded-[24px] bg-navy-900 sm:mx-4 sm:mt-3 lg:mx-6 ${paused ? "hero-paused" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Rotating background images with a slow drift on the active one */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={i === 0}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
            quality={68}
            className="object-cover"
            sizes="100vw"
          />
        </div>
      ))}

      {/* Fixed left-side overlay + a soft bottom vignette for the controls */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07192d]/95 via-[#07192d]/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07192d]/65 via-transparent to-[#07192d]/10" />

      <div className="container-x relative flex h-full items-center">
        <div className="max-w-2xl pb-8 sm:pb-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {content.eyebrow}
          </span>
          <h1 className="mt-5 max-w-xl font-display text-[44px] font-bold leading-[0.98] tracking-[-0.035em] text-white min-[390px]:text-5xl sm:text-7xl lg:text-[82px]">
            Style that feels <span className="italic text-brand">like you.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 sm:text-lg sm:leading-8">
            {content.subtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[360px]:flex-row">
            <Link href={content.href} className="btn-primary px-7 py-3.5">
              {content.cta}
            </Link>
            <Link
              href="/about"
              className="btn border border-white/25 bg-white/5 px-7 py-3.5 text-white backdrop-blur-sm hover:border-white/50 hover:bg-white/10"
            >
              About Beyos Clothing
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators — the active one fills up over the slide's duration */}
      <div className="absolute bottom-7 right-7 z-10 flex gap-2 sm:right-10">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrent(i)}
            aria-label={`Show image ${i + 1}`}
            className={`h-1 overflow-hidden rounded-full transition-all duration-300 ${
              i === current ? "w-12 bg-white/25" : "w-5 bg-white/25 hover:bg-white/50"
            }`}
          >
            {i === current && <span className="hero-progress block h-full rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      <style jsx>{`
        .hero-progress {
          animation: heroProgress ${SLIDE_MS}ms linear forwards;
        }
        .hero-paused .hero-progress {
          animation-play-state: paused;
        }
        @keyframes heroProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.hero-kenburns) {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
