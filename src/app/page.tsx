import Link from "next/link";
import Image from "next/image";
import HeroCarousel from "@/components/HeroCarousel";
import ServiceHighlights from "@/components/ServiceHighlights";
import CategoryCarousel from "@/components/CategoryCarousel";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";
import Newsletter from "@/components/Newsletter";
import { getBestSellingProducts, getFeaturedProducts, getNewArrivalProducts } from "@/lib/products-db";
import { getHomeCategories } from "@/lib/categories-db";
import type { Metadata } from "next";
import { getHeroSlides } from "@/lib/hero-slides";
import RecentlyViewed from "@/components/RecentlyViewed";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getActiveHomepagePromotions } from "@/lib/promotions";
import ProductRail from "@/components/ProductRail";
import LimitedOffer from "@/components/LimitedOffer";
import ShopTheLook from "@/components/ShopTheLook";
import FAQSection, { homepageFaqs } from "@/components/FAQSection";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  title: "Online Clothing Store Sri Lanka",
  description:
    "Shop premium oversized and graphic T-shirts online in Sri Lanka. Enjoy secure payments, cash on delivery and island-wide delivery from Beyos Clothing.",
  keywords: [
    "online clothing store Sri Lanka",
    "oversized t shirts Sri Lanka",
    "graphic t shirts Sri Lanka",
    "premium t shirts Sri Lanka",
    "Sri Lankan clothing brand",
    "Beyos Clothing",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Online Clothing Store Sri Lanka | Beyos Clothing",
    description:
      "Shop premium oversized and graphic T-shirts with secure payments and island-wide delivery across Sri Lanka.",
    url: "/",
    siteName: SITE_NAME,
  },
};

// Cache the storefront HTML for fast repeat requests. Admin catalog, category,
// hero and promotion writes call revalidatePath("/") so changes still appear
// immediately; this one-minute window is only a safety net.
export const revalidate = 60;
// The homepage is backed by live catalog/category/promotion queries. Rendering
// it on request prevents production builds from failing when build-time DB
// state differs from the running application.
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
    title: "Fast Island-Wide Delivery",
    desc: "Reliable, fast shipping to every corner of Sri Lanka.",
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

// Avoid repeating six catalog queries (including the best-seller aggregation)
// for every homepage request. The short TTL matches the storefront freshness
// window while keeping the first byte fast during normal traffic.
const getHomePageData = unstable_cache(
  async () => Promise.all([
    getFeaturedProducts(),
    getNewArrivalProducts(8),
    getBestSellingProducts(8),
    getHomeCategories(),
    getHeroSlides(),
    getActiveHomepagePromotions(),
  ]),
  ["homepage-data-v2"],
  { revalidate: 60 }
);

export default async function HomePage() {
  const [featured, newArrivals, bestSellers, homeCategories, heroSlides, activePromotions] = await getHomePageData();

  return (
    <main className="home-premium-background overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: SITE_NAME,
            url: SITE_URL.toString(),
            description:
              "Sri Lankan online clothing store for premium oversized, graphic and custom printed T-shirts.",
            areaServed: { "@type": "Country", name: "Sri Lanka" },
            currenciesAccepted: "LKR",
            paymentAccepted: ["Cash on Delivery", "Card Payment"],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: homepageFaqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }).replace(/</g, "\\u003c"),
        }}
      />
      <HeroCarousel slides={heroSlides} />
      <ServiceHighlights />

      {/* Categories */}
      <section className="container-x mt-20 sm:mt-24">
        <div className="flex items-end justify-between gap-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600">Find your style</p><h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy-800 sm:text-5xl">Shop by collection</h2></div>
          <Link href="/shop" className="shrink-0 pt-1 text-sm font-semibold text-navy-800 transition hover:text-brand">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <CategoryCarousel categories={homeCategories} />
      </section>

      {activePromotions.length > 0 && <LimitedOffer promotions={activePromotions} />}

      {/* Featured products */}
      <section className="mt-20 bg-[#f2f5f8]/80 py-16 sm:mt-24 sm:py-24">
        <div className="container-x">
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
        </div>
      </section>

      <ProductRail eyebrow="Just landed" title="New Arrivals" products={newArrivals} />

      <ShopTheLook products={newArrivals} />

      <ProductRail eyebrow="Customer favourites" title="Best Sellers" products={bestSellers} />

      <RecentlyViewed />

      {/* Custom printing banner */}
      <section className="container-x mt-20 sm:mt-28">
        <div className="premium-dark glass-edge grid overflow-hidden rounded-[28px] bg-navy-900 text-white ring-1 ring-white/10 lg:grid-cols-[.9fr_1.1fr]">
          <div className="relative min-h-[380px] lg:order-1 lg:min-h-[560px]">
            <Image src="/images/about/Woman_about.jpeg" alt="Beyos clothing craftsmanship and style" fill sizes="(max-width: 1023px) 100vw, 55vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/40 to-transparent" />
          </div>
          <div className="flex flex-col justify-center p-7 sm:p-14 lg:p-16">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-400">Made for your story</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">More than clothing.<br/><span className="italic text-brand-400">A way to show up.</span></h2>
            <p className="mt-5 max-w-lg leading-7 text-white/65">
              From single pieces to team orders, bring your ideas to life with
              custom sizes, styles and prints. No die & plate charges, low
              minimum order quantities, and premium finishes every time.
            </p>
            <div className="mt-7 flex flex-col gap-3 min-[360px]:flex-row min-[360px]:gap-4">
              <Link href="/shop" className="btn-primary">Explore collection
              </Link>
              <Link href="/about" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">Our story</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="container-x mt-20 sm:mt-28">
        <SectionHeader
          eyebrow="Why Beyos"
          title="Why Customize With Us"
        />
        <div className="premium-panel glass-edge grid overflow-hidden rounded-3xl bg-white/55 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="relative border-b border-white/70 bg-gradient-to-br from-white/55 to-navy-50/45 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.9)] transition hover:bg-white/80 sm:p-8 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <FeatureIcon name={f.icon} />
              </div>
              <h3 className="mt-4 text-base font-bold text-navy-800">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/70">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-20 bg-navy-50/70 py-16 sm:mt-28 sm:py-24">
        <div className="container-x">
        <SectionHeader
          eyebrow="Testimonials"
          title="What People Are Saying"
        />
        <p className="-mt-4 mb-8 text-navy-800/60">Real feedback from customers who chose Beyos.</p>
        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="premium-card glass-edge flex flex-col rounded-2xl border border-white/70 bg-white/60 p-7 sm:p-8"
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
                  <p className="text-xs text-navy-800/55">Verified customer · {t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
        </div>
      </section>

      <section className="container-x mt-20 sm:mt-28">
        <div className="premium-dark glass-edge relative overflow-hidden rounded-[28px] bg-brand-600 px-6 py-14 text-center text-white ring-1 ring-white/15 sm:px-12 sm:py-20">
          <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full border-[40px] border-white/5" /><div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-white/5" />
          <div className="relative mx-auto max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/65">Your next favourite is waiting</p><h2 className="mt-3 font-display text-4xl font-bold sm:text-6xl">Find the piece that feels like you.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Everyday comfort, expressive details and island-wide delivery—made simple.</p><Link href="/shop" className="mt-7 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand-700 shadow-xl transition hover:-translate-y-0.5">Shop all products →</Link></div>
        </div>
      </section>

      <FAQSection />

      <Newsletter />
    </main>
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
