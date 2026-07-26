import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop?category=men", label: "Men's Collection" },
      { href: "/shop?category=women", label: "Women's Collection" },
      { href: "/shop?category=accessories", label: "Accessories" },
      { href: "/promotions", label: "Offers & Promotions" },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/about", label: "About Beyos" },
      { href: "/about#story", label: "Our Story" },
      { href: "/shop", label: "New Arrivals" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { href: "/contact", label: "Help Centre" },
      { href: "/contact", label: "Shipping & Returns" },
      { href: "/contact", label: "Size Guide" },
      { href: "https://koombiyodelivery.lk/track", label: "Track Your Order", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-[#091b2f] text-white">
      <div className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#a94700]/15 blur-3xl" />

      <div className="container-x relative pt-14 sm:pt-16">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-100">Style is forever</span>
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Wear confidence. Make every day yours.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">Explore premium clothing made for comfort, character and everyday Sri Lankan life.</p>
          </div>
          <Link href="/shop" className="mt-6 inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#a94700] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#c25300] lg:mt-0">
            Shop the collection <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr] lg:gap-10 lg:py-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Beyos Clothing home">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/20">
                <Image src="/images/logo.png" alt="" width={72} height={72} className="h-full w-full object-contain p-1" />
              </span>
              <span>
                <span className="block text-xl font-bold tracking-tight">Beyos <span className="text-brand">Clothing</span></span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Style is forever</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">Premium clothing and custom apparel, thoughtfully selected for lasting comfort and effortless style. Delivered island-wide.</p>

            <div className="mt-6 space-y-3 text-sm text-white/65">
              <a href="tel:+94743191200" className="flex items-center gap-3 transition hover:text-white"><ContactIcon name="phone" /><span>+94 74 319 1200</span></a>
              <a href="mailto:info@beyosclothing.com" className="flex items-center gap-3 transition hover:text-white"><ContactIcon name="mail" /><span>info@beyosclothing.com</span></a>
              <span className="flex items-center gap-3"><ContactIcon name="truck" /><span>Island-wide delivery, Sri Lanka</span></span>
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">{column.title}</h2>
              <ul className="mt-5 space-y-3.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><span className="h-px w-0 bg-brand transition-all group-hover:w-3" />{link.label}</a>
                    ) : (
                      <Link href={link.href} className="group inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><span className="h-px w-0 bg-brand transition-all group-hover:w-3" />{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-6 text-xs text-white/40 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <p>© {new Date().getFullYear()} Beyos Clothing. All rights reserved.</p>
            <Link href="/privacy" className="transition hover:text-white">Privacy & Cookies</Link>
            <Link href="/contact" className="transition hover:text-white">Terms & Conditions</Link>
          </div>
          <div className="flex items-center gap-3">
            <span>Secure shopping</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 font-bold text-white/65">COD</span>
              <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 font-bold text-white/65">OnePay</span>
            </div>
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <a href="https://perfectsolutioninternational.com" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 transition hover:opacity-90 sm:flex">
              <span>Built by</span><Image src="/images/logo/psi-logo.png" alt="Perfect Solution International" width={90} height={28} className="h-6 w-auto object-contain" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ContactIcon({ name }: { name: "phone" | "mail" | "truck" }) {
  const paths = {
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></>,
    truck: <><path d="M10 17h4V5H2v12h3" /><path d="M14 9h4l4 4v4h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="17.5" r="2.5" /></>,
  };
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-brand"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg></span>;
}
