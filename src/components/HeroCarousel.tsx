"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

// Fixed hero content — stays in place while only the background images rotate.
const content = {
  eyebrow: "New Season Collection",
  title: "Style Is Forever",
  subtitle:
    "Timeless pieces, crafted to last. Discover the new Beyos collection for men and women.",
  cta: "Shop the Collection",
  href: "/shop",
};

// Background images that cycle behind the fixed text.
const images = [
  "/images/hero-images/hero1.webp",
  "/images/hero-images/hero3.webp",
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % images.length),
    []
  );

  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <section className="relative h-[70vh] min-h-[520px] w-full overflow-hidden bg-navy-900">
      {/* Rotating background images */}
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
            className="object-cover"
            sizes="100vw"
          />
        </div>
      ))}

      {/* Fixed left-side overlay + content */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/85 via-navy-900/50 to-transparent" />
      <div className="container-x relative flex h-full items-center">
        <div className="max-w-xl animate-fade-up">
          <span className="badge bg-brand text-white">{content.eyebrow}</span>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl">
            {content.title}
          </h1>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
            {content.subtitle}
          </p>
          <div className="mt-8 flex gap-4">
            <Link href={content.href} className="btn-primary">
              {content.cta}
            </Link>
            <Link
              href="/about"
              className="btn border border-white/30 text-white hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Image indicator dots */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Show image ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-8 bg-brand" : "w-2 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
