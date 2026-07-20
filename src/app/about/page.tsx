import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Beyos Clothing — our story, our values, and our commitment to timeless, quality fashion.",
};

const stats = [
  { value: "15K+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
  { value: "10+", label: "Years of Craft" },
  { value: "98%", label: "5-Star Reviews" },
];

const values = [
  {
    title: "Quality First",
    desc: "Every stitch, every print, every fabric is chosen with care. We never compromise on quality.",
  },
  {
    title: "Timeless Design",
    desc: "We design for the long run — pieces that stay relevant season after season. Style Is Forever.",
  },
  {
    title: "Made for You",
    desc: "Custom sizes, styles and prints with low minimums. Fashion that fits your vision, not the other way around.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy-800 py-20 text-white">
        <div className="container-x text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            About Beyos
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-bold sm:text-5xl">
            Fashion crafted to last a lifetime
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            Beyos Clothing was built on a simple belief — that great style never
            goes out of fashion. We create timeless, quality-crafted pieces for
            men and women, and bring custom designs to life for people and
            businesses alike.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="container-x -mt-12">
        <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-8 shadow-lg ring-1 ring-navy-800/5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-brand sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-navy-800/60">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section id="story" className="container-x mt-20 scroll-mt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy-50">
            <Image
              src="/images/about/about-image.jpeg"
              alt="Beyos Clothing"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">
              Our Story
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy-800 sm:text-4xl">
              From a small idea to a lasting brand
            </h2>
            <p className="mt-5 leading-relaxed text-navy-800/70">
              What started as a passion for well-made clothing grew into Beyos —
              a brand trusted by thousands. We combine premium materials with
              modern printing techniques to deliver garments that look great and
              stand the test of time.
            </p>
            <p className="mt-4 leading-relaxed text-navy-800/70">
              Whether you&apos;re shopping our ready-to-wear collection or
              designing a custom order, our promise stays the same: honest
              craftsmanship, fair pricing, and service that puts you first.
            </p>
            <Link href="/shop" className="btn-primary mt-7">
              Explore the Collection
            </Link>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="container-x mt-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">
            What We Stand For
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-800 sm:text-4xl">
            Our Values
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <div
              key={v.title}
              className="rounded-2xl border border-navy-800/10 bg-white p-8"
            >
              <span className="font-display text-4xl font-bold text-brand/30">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-lg font-bold text-navy-800">
                {v.title}
              </h3>
              <p className="mt-2 leading-relaxed text-navy-800/60">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container-x my-20 scroll-mt-28">
        <div className="grid gap-10 rounded-3xl bg-navy-50 p-8 sm:p-14 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-navy-800">
              Get in Touch
            </h2>
            <p className="mt-3 text-navy-800/70">
              Have a question or a custom order in mind? We&apos;d love to hear
              from you.
            </p>
            <ul className="mt-6 space-y-4 text-sm">
              <li className="flex items-center gap-3 text-navy-800/80">
                <ContactIcon name="mail" />
                info@beyosclothing.com
              </li>
              <li className="flex items-center gap-3 text-navy-800/80">
                <ContactIcon name="phone" />
                +94 77 123 4567
              </li>
              <li className="flex items-center gap-3 text-navy-800/80">
                <ContactIcon name="pin" />
                Colombo, Sri Lanka
              </li>
            </ul>
          </div>
          <form className="grid gap-4">
            <input className="input" placeholder="Your name" />
            <input className="input" type="email" placeholder="Your email" />
            <textarea
              rows={4}
              className="input resize-none"
              placeholder="Your message"
            />
            <button type="button" className="btn-primary w-full sm:w-auto">
              Send Message
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function ContactIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-brand",
  };
  if (name === "mail")
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    );
  if (name === "phone")
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.6 2Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
