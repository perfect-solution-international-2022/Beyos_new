import Link from "next/link";
import Image from "next/image";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";
import Newsletter from "@/components/Newsletter";
import { getFeaturedProducts } from "@/lib/products-db";
import { getHomeCategories } from "@/lib/categories-db";

// Featured products come from MySQL (admin-managed) — must not be cached
// at build time, or admin edits wouldn't show up until a rebuild.
export const dynamic = "force-dynamic";

const features = [
  {
    title: "Low Minimum Orders",
    desc: "Order exactly what you need — no bulk requirements, no die or plate charges.",
    icon: "box",
  },
  {
    title: "Premium Print Quality",
    desc: "High-quality offset & DTG printing that stays vivid wash after wash.",
    icon: "spark",
  },
  {
    title: "Secure Payment",
    desc: "Checkout with confidence using encrypted, trusted payment methods.",
    icon: "lock",
  },
  {
    title: "Fast & Free Delivery",
    desc: "Free island-wide shipping on orders over LKR 10,000, delivered fast.",
    icon: "truck",
  },
];

const testimonials = [
  {
    name: "Dean D.",
    role: "Director",
    quote:
      "Great quality products and exceptional service. The custom prints came out exactly as we designed them.",
  },
  {
    name: "Cristian L.",
    role: "Manager",
    quote:
      "Best service ever. Fast turnaround, fair pricing and the fabric quality genuinely impressed our whole team.",
  },
  {
    name: "Leonel R.",
    role: "Designer",
    quote:
      "Top-notch support from start to finish. Beyos has become our go-to for both everyday wear and custom orders.",
  },
];

export default async function HomePage() {
  const [featured, homeCategories] = await Promise.all([
    getFeaturedProducts(),
    getHomeCategories(),
  ]);

  return (
    <>
      <HeroCarousel />

      {/* Categories */}
      <section className="container-x mt-14">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-navy-800 min-[360px]:text-2xl sm:text-3xl">
            Shopping By Categories
          </h2>
          <Link href="/shop" className="shrink-0 pt-1 text-sm font-semibold text-navy-800 transition hover:text-brand">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 sm:gap-x-8">
          {homeCategories.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="group flex flex-col items-center text-center"
            >
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-navy-50 ring-1 ring-navy-800/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg min-[360px]:h-28 min-[360px]:w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(min-width: 1024px) 144px, (min-width: 640px) 128px, (min-width: 360px) 112px, 96px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-4 text-base font-semibold text-navy-800 transition group-hover:text-brand">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-x mt-20">
        <SectionHeader
          eyebrow="Explore Beyos"
          title="Featured Products"
          action={{ href: "/shop", label: "View all" }}
        />
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Custom printing banner */}
      <section className="container-x mt-20">
        <div className="grid overflow-hidden rounded-3xl bg-navy-50 lg:grid-cols-2">
          <div className="flex flex-col justify-center p-6 sm:p-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">
              Custom Clothing
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy-800 sm:text-4xl">
              Design It Your Way
            </h2>
            <p className="mt-4 text-navy-800/70">
              From single pieces to team orders, bring your ideas to life with
              custom sizes, styles and prints. No die & plate charges, low
              minimum order quantities, and premium finishes every time.
            </p>
            <div className="mt-7 flex flex-col gap-3 min-[360px]:flex-row min-[360px]:gap-4">
              <Link href="/shop" className="btn-primary">
                Start Your Design
              </Link>
              <Link href="/about" className="btn-outline">
                How It Works
              </Link>
            </div>
          </div>
          <div className="relative min-h-[280px]">
            <Image
              src="/images/about/about-image.jpeg"
              alt="Custom clothing"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="container-x mt-20">
        <SectionHeader
          eyebrow="Why Beyos"
          title="Why Customize With Us"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-navy-800/10 bg-white p-6 transition hover:border-brand/40 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <FeatureIcon name={f.icon} />
              </div>
              <h3 className="mt-4 text-base font-bold text-navy-800">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/60">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-x mt-20">
        <SectionHeader
          eyebrow="Testimonials"
          title="What People Are Saying"
        />
        <p className="-mt-4 mb-8 text-navy-800/60">
          Trusted by more than 15,000+ customers and businesses.
        </p>
        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-navy-800/10 bg-white p-7"
            >
              <div className="flex gap-0.5 text-brand">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-navy-800/70">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-navy-800">{t.name}</p>
                  <p className="text-xs text-navy-800/50">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <Newsletter />
    </>
  );
}

function FeatureIcon({ name }: { name: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "box")
    return (
      <svg {...common}>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <polyline points="3.3 7 12 12 20.7 7" />
        <line x1="12" y1="22" x2="12" y2="12" />
      </svg>
    );
  if (name === "spark")
    return (
      <svg {...common}>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      </svg>
    );
  if (name === "lock")
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
