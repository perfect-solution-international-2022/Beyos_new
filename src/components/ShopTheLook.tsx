import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import SectionHeader from "./SectionHeader";

export default function ShopTheLook({ products }: { products: Product[] }) {
  const picks = products.slice(0, 2);
  if (!picks.length) return null;

  return (
    <section className="container-x mt-20">
      <SectionHeader eyebrow="Styled by Beyos" title="Shop The Look" action={{ href: "/shop", label: "Shop all" }} />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.55fr)]">
        <div className="relative min-h-[460px] overflow-hidden rounded-2xl bg-navy-50 sm:min-h-[580px]">
          <Image src="/images/hero-images/hero1.webp" alt="Beyos menswear styling inspiration" fill sizes="(max-width: 1023px) 100vw, 70vw" className="object-cover" />
          {picks.map((product, index) => (
            <Link key={product.id} href={`/product/${product.slug}`} aria-label={`View ${product.name}`} className={`group absolute flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-brand text-lg font-bold text-white shadow-lg transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${index === 0 ? "left-[46%] top-[48%]" : "left-[58%] top-[64%]"}`}>
              <span aria-hidden="true">+</span>
              <span className={`pointer-events-none absolute top-1/2 hidden w-48 -translate-y-1/2 rounded-lg bg-white px-3 py-2 text-left text-xs font-semibold text-navy-800 opacity-0 shadow-xl transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:block ${index === 0 ? "left-full ml-3" : "right-full mr-3"}`}>{product.name}<small className="mt-0.5 block font-bold text-brand">{formatPrice(product.price)}</small></span>
            </Link>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-3">
          {picks.map((product) => (
            <Link key={product.id} href={`/product/${product.slug}`} className="group flex items-center gap-4 border-b border-navy-800/10 py-4 first:pt-0 last:border-0">
              <span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-50"><Image src={product.image} alt={product.imageAlt || product.name} fill sizes="80px" className="object-cover transition duration-300 group-hover:scale-105" /></span>
              <span className="min-w-0"><strong className="block text-sm text-navy-800 transition group-hover:text-brand">{product.name}</strong><span className="mt-1 block text-sm font-bold text-brand">{formatPrice(product.price)}</span></span>
            </Link>
          ))}
          <p className="mt-3 text-sm leading-6 text-navy-800/60">Tap a hotspot or choose an item to explore the fit, available options and product details.</p>
        </div>
      </div>
    </section>
  );
}
