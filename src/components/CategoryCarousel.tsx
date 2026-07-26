"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

interface Category { id: number; name: string; href: string; image: string; }

export default function CategoryCarousel({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => trackRef.current?.scrollBy({ left: direction * Math.max(trackRef.current.clientWidth * 0.75, 240), behavior: "smooth" });

  return (
    <div className="relative mt-8">
      <div ref={trackRef} className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:gap-8 sm:px-0 lg:gap-10">
        {categories.map((category) => (
          <Link key={category.id} href={category.href} className="group glass-edge flex w-[calc((100%-1.25rem)/2)] shrink-0 snap-start flex-col items-center rounded-[26px] border border-white/80 bg-gradient-to-br from-white/90 via-white/65 to-navy-50/75 px-3 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,1),0_5px_12px_rgba(8,24,39,.07),0_20px_42px_rgba(8,24,39,.12)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-brand-500/25 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_12px_22px_rgba(8,24,39,.10),0_30px_60px_rgba(8,24,39,.18)] sm:w-[calc((100%-4rem)/3)] lg:w-[calc((100%-9rem)/4)] xl:w-[calc((100%-12rem)/5)]">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-navy-50 ring-[6px] ring-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_5px_12px_rgba(9,23,34,.12),0_18px_35px_rgba(9,23,34,.18)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:shadow-[0_12px_22px_rgba(9,23,34,.14),0_28px_45px_rgba(9,23,34,.22)] min-[360px]:h-28 min-[360px]:w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
              <Image src={category.image} alt={`${category.name} collection`} fill sizes="(min-width:1024px) 144px, (min-width:640px) 128px, 112px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
            <h3 className="relative z-20 mt-4 text-base font-bold text-navy-800 transition group-hover:text-brand">{category.name}</h3>
            <span className="relative z-20 mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-800/40">Explore →</span>
          </Link>
        ))}
      </div>
      {categories.length > 4 && <><Arrow label="Previous categories" side="left" onClick={() => scroll(-1)} /><Arrow label="Next categories" side="right" onClick={() => scroll(1)} /></>}
    </div>
  );
}

function Arrow({ label, side, onClick }: { label: string; side: "left" | "right"; onClick: () => void }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`absolute top-16 hidden h-10 w-10 items-center justify-center rounded-full border border-navy-800/10 bg-white text-2xl text-navy-800 shadow-md transition hover:border-brand hover:text-brand lg:flex ${side === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"}`}><span aria-hidden="true">{side === "left" ? "‹" : "›"}</span></button>;
}
