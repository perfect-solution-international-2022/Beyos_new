"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDE_MS = 6000;

// Fixed hero content — stays in place while only the background images rotate.
const content = {
  eyebrow: "New Season Collection",
  subtitle:
    "Timeless pieces, crafted to last. Discover the new Beyos collection for men and women.",
  cta: "Shop the Collection",
  href: "/shop",
};

// Background images that cycle behind the fixed text.
const images = [
  "/images/hero-images/hero1.webp",
  "/images/hero-images/hero2.webp",
  "/images/hero-images/hero3.webp",
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // One timer per slide (recreated on change) so a manual pick also gets a full interval.
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(
      () => setCurrent((c) => (c + 1) % images.length),
      SLIDE_MS
    );
    return () => clearTimeout(id);
  }, [current, paused]);

  return (
    <section
      className={`relative mx-3 mt-3 h-[56vh] min-h-[420px] overflow-hidden rounded-3xl bg-navy-900 sm:mx-0 sm:mt-0 sm:h-[70vh] sm:min-h-[520px] sm:rounded-none ${paused ? "hero-paused" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Rotating background images with a slow drift on the active one */}
      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            className={`object-cover ${i === current ? "hero-kenburns" : ""}`}
            sizes="100vw"
          />
        </div>
      ))}

      {/* Fixed left-side overlay + a soft bottom vignette for the controls */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-900/50 to-navy-900/10" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-900/60 to-transparent" />

      <div className="container-x relative flex h-full items-center">
        <div className="max-w-xl">
          <span className="badge animate-fade-up bg-brand text-white">
            {content.eyebrow}
          </span>
          <h1 className="animate-fade-up mt-4 font-display text-5xl font-bold leading-tight text-white [animation-delay:100ms] sm:text-6xl md:text-7xl">
            Style Is <span className="italic text-brand">Forever</span>
          </h1>
          <p className="animate-fade-up mt-4 text-base text-white/80 [animation-delay:200ms] sm:text-lg">
            {content.subtitle}
          </p>
          <div className="animate-fade-up mt-8 flex gap-4 [animation-delay:300ms]">
            <Link href={content.href} className="btn-primary">
              {content.cta}
            </Link>
            <Link
              href="/about"
              className="btn border border-white/40 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators — the active one fills up over the slide's duration */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Show image ${i + 1}`}
            className={`h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
              i === current ? "w-10 bg-white/30" : "w-5 bg-white/30 hover:bg-white/60"
            }`}
          >
            {i === current && <span className="hero-progress block h-full rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      <style jsx>{`
        :global(.hero-kenburns) {
          animation: heroKenburns 7s linear forwards;
        }
        .hero-progress {
          animation: heroProgress ${SLIDE_MS}ms linear forwards;
        }
        .hero-paused :global(.hero-kenburns),
        .hero-paused .hero-progress {
          animation-play-state: paused;
        }
        @keyframes heroKenburns {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.08);
          }
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
