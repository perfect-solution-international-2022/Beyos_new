"use client";

import { useRef } from "react";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import SectionHeader from "./SectionHeader";

export default function ProductRail({
  eyebrow,
  title,
  products,
}: {
  eyebrow: string;
  title: string;
  products: Product[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.82, behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <section className="container-x mt-20">
      <div className="flex items-end justify-between gap-4">
        <SectionHeader eyebrow={eyebrow} title={title} action={{ href: "/shop", label: "View all" }} />
        <div className="mb-8 hidden shrink-0 items-center gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label={`Previous ${title}`} title="Previous" className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800/15 bg-white text-navy-800 transition hover:border-brand hover:text-brand">
            <ArrowIcon direction="left" />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={`Next ${title}`} title="Next" className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-800/15 bg-white text-navy-800 transition hover:border-brand hover:text-brand">
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:gap-5 sm:px-0">
        {products.map((product) => (
          <div key={product.id} className="w-[calc((100%-1rem)/2)] shrink-0 snap-start md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
