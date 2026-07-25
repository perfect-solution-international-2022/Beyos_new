"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

interface Category {
  id: number;
  name: string;
  href: string;
  image: string;
}

export default function CategoryCarousel({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.75, 240), behavior: "smooth" });
  };

  return (
    <div className="relative mt-8">
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:gap-8 sm:px-0 lg:gap-10"
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group flex w-[calc((100%-1.25rem)/2)] shrink-0 snap-start flex-col items-center text-center sm:w-[calc((100%-4rem)/3)] lg:w-[calc((100%-9rem)/4)] xl:w-[calc((100%-12rem)/5)]"
          >
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-navy-50 ring-1 ring-navy-800/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg min-[360px]:h-28 min-[360px]:w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(min-width: 1024px) 144px, (min-width: 640px) 128px, (min-width: 360px) 112px, 96px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="mt-4 text-base font-semibold text-navy-800 transition group-hover:text-brand">
              {category.name}
            </h3>
          </Link>
        ))}
      </div>

      {categories.length > 4 && (
        <>
          <button
            type="button"
            aria-label="Previous categories"
            title="Previous categories"
            onClick={() => scroll(-1)}
            className="absolute left-0 top-16 hidden h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-navy-800/10 bg-white text-2xl text-navy-800 shadow-md transition hover:border-brand hover:text-brand lg:flex"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            aria-label="Next categories"
            title="Next categories"
            onClick={() => scroll(1)}
            className="absolute right-0 top-16 hidden h-10 w-10 translate-x-1/2 items-center justify-center rounded-full border border-navy-800/10 bg-white text-2xl text-navy-800 shadow-md transition hover:border-brand hover:text-brand lg:flex"
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
    </div>
  );
}
