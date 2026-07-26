import Image from "next/image";
import Link from "next/link";

interface Category { id: number; name: string; href: string; image: string; }

export default function CategoryCarousel({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <div className="mt-8 grid auto-rows-[220px] gap-3 sm:auto-rows-[280px] sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
      {categories.slice(0, 5).map((category, index) => (
        <Link key={category.id} href={category.href} className={`group relative overflow-hidden rounded-2xl bg-navy-100 ${index === 0 ? "sm:row-span-2 lg:col-span-2" : ""} ${index === 1 ? "lg:col-span-2" : ""}`}>
          <Image src={category.image} alt={`${category.name} collection`} fill sizes={index === 0 ? "(max-width: 639px) 100vw, 50vw" : "(max-width: 639px) 100vw, 25vw"} className="object-cover transition duration-700 ease-out group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Explore collection</p><h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{category.name}</h3></div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-xl text-white backdrop-blur transition group-hover:border-white group-hover:bg-white group-hover:text-navy-800">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
