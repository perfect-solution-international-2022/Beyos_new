import Link from "next/link";
import Image from "next/image";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/shop?category=men", label: "Men" },
      { href: "/shop?category=women", label: "Women" },
      { href: "/shop?category=accessories", label: "Accessories" },
      { href: "/shop", label: "All Products" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/about#story", label: "Our Story" },
      { href: "/about#contact", label: "Contact" },
      { href: "/shop", label: "New Arrivals" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/about#contact", label: "Help Center" },
      { href: "/about#contact", label: "Shipping & Returns" },
      { href: "/about#contact", label: "Size Guide" },
      { href: "/about#contact", label: "Track Order" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 bg-navy-800 text-white">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Beyos Clothing"
                width={120}
                height={120}
                className="h-16 w-16 rounded-full bg-white object-contain p-1"
              />
              <div>
                <p className="text-lg font-bold">
                  Beyos<span className="text-brand"> Clothing</span>
                </p>
                <p className="text-xs text-white/60">Style Is Forever</p>
              </div>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Timeless, quality-crafted fashion for every occasion. Designed to
              last, styled to stand out.
            </p>
            <div className="mt-5 flex gap-3">
              {["instagram", "facebook", "twitter"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-brand"
                >
                  <SocialIcon name={s} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Beyos Clothing. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "currentColor",
  } as const;
  if (name === "instagram")
    return (
      <svg {...common}>
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z" />
      </svg>
    );
  if (name === "facebook")
    return (
      <svg {...common}>
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M18.9 7.3c0 .2 0 .4 0 .6 0 5.5-4.2 11.8-11.8 11.8A11.7 11.7 0 0 1 1 17.9a8.3 8.3 0 0 0 6.1-1.7 4.2 4.2 0 0 1-3.9-2.9 4.2 4.2 0 0 0 1.9-.1A4.2 4.2 0 0 1 1.7 9v-.1a4.2 4.2 0 0 0 1.9.5A4.2 4.2 0 0 1 2.3 3.8a11.8 11.8 0 0 0 8.6 4.3 4.2 4.2 0 0 1 7.1-3.8 8.3 8.3 0 0 0 2.6-1 4.2 4.2 0 0 1-1.8 2.3 8.3 8.3 0 0 0 2.4-.7 8.5 8.5 0 0 1-2.3 2.4Z" />
    </svg>
  );
}
