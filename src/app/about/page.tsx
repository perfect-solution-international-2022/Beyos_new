import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Beyos Clothing, our vision, mission, and commitment to premium custom T-shirt printing.",
};

const stats = [
  { value: "10K+", label: "Shirts Printed" },
  { value: "500+", label: "Happy Businesses" },
  { value: "100%", label: "DTF Quality" },
];

const visionMission = [
  {
    icon: "eye",
    title: "Our Vision",
    description:
      "To become a trusted and innovative clothing brand that inspires self-expression through high-quality, creative, and affordable custom T-shirt printing.",
  },
  {
    icon: "target",
    title: "Our Mission",
    description:
      "Our mission is to deliver premium DTF printed T-shirts with vibrant designs, lasting quality, and exceptional service—helping individuals, businesses, and communities bring their ideas to life through fashion.",
  },
];

const reasons = [
  {
    icon: "shirt",
    title: "Premium Fabrics",
    description: "Soft, durable blends chosen for comfort that holds up wash after wash.",
  },
  {
    icon: "leaf",
    title: "Sustainable Sourcing",
    description: "Responsibly sourced materials and low-waste DTF printing methods.",
  },
  {
    icon: "truck",
    title: "Fast Shipping",
    description: "Quick turnaround and island-wide delivery, tracked from print to doorstep.",
  },
  {
    icon: "sparkle",
    title: "Unique Designs",
    description: "Bold, original artwork and custom orders tailored to your vision.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900 py-16 text-center text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,133,31,0.18),_transparent_55%)]" />
        <div className="container-x relative">
          <span className="badge bg-white/10 text-white/80">Est. Beyos Clothing</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">About Us</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70 sm:text-base">Style For The Modern You</p>
        </div>
      </section>

      {/* Story + image */}
      <section className="container-x py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,480px)_1fr] lg:gap-10">
          <div className="relative mx-auto w-full max-w-[480px] lg:mx-0">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-brand-50 sm:-inset-4" />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.75rem] shadow-xl shadow-navy-900/10 sm:aspect-[4/5]">
              <Image
                src="/images/about/Woman_about.jpeg"
                alt="Printing a custom design onto a Beyos T-shirt"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-6 -right-4 w-[85%] rounded-2xl border border-navy-800/5 bg-white p-4 shadow-xl shadow-navy-900/10 sm:-right-6 sm:w-auto sm:p-5">
              <div className="flex items-center gap-4 sm:gap-6">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display text-lg font-bold text-navy-800 sm:text-xl">{s.value}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-navy-800/45 sm:text-[11px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Our Story</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy-800 sm:text-3xl lg:text-4xl">
              Crafted for Everyday Self-Expression
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-navy-800/70">
              <p>
                Beyos Clothing is a custom T-shirt printing brand delivering stylish, high-quality designs for everyday wear. We turn your ideas into wearable art with premium prints and comfortable fabrics.
              </p>
              <p>
                We specialize in high-quality DTF T-shirt printing, delivering bold designs, vibrant colors, and long-lasting prints—perfect for personal wear, businesses, events, and custom orders.
              </p>
              <p>
                From custom designs to bulk orders, every piece is printed with sharp detail, rich color, and durable quality, so your ideas hold up as well as your favorite tee.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-primary">Shop Collection</Link>
              <Link href="/contact" className="btn-outline">Get in Touch</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-navy-50/60 py-14 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">What Drives Us</span>
            <h2 className="mt-3 font-display text-2xl font-bold text-navy-800 sm:text-3xl">Vision and Mission</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {visionMission.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-navy-800/5 bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition hover:-translate-y-1 hover:shadow-lg sm:p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <Icon name={item.icon} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-navy-800">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-navy-800/60">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container-x py-14 sm:py-20 lg:py-24">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Why Beyos</span>
          <h2 className="mt-3 font-display text-2xl font-bold text-navy-800 sm:text-3xl">Why Choose Us</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-navy-800/55">
            We prioritize quality, ethics, and your experience above all else. Every choice we make is designed to provide you with clothing you can be proud to wear.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((item) => (
            <article
              key={item.title}
              className="group rounded-2xl border border-navy-800/5 bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 transition group-hover:bg-brand group-hover:text-white">
                <Icon name={item.icon} />
              </span>
              <h3 className="mt-4 font-bold text-navy-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-navy-800/60">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="container-x pb-14 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-8 py-12 text-center sm:px-14 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(245,133,31,0.22),_transparent_55%)]" />
          <div className="relative">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Ready to wear your story?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">
              Browse our collection or reach out for a custom order—we&apos;ll bring your idea to life in premium DTF print.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn-primary">Shop Collection</Link>
              <Link href="/contact" className="btn border border-white/20 text-white hover:bg-white/10">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    eye: (<><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></>),
    target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>),
    shirt: (<path d="M8 3 3 6.5V10h3v11h12V10h3V6.5L16 3l-2 2h-4L8 3Z" />),
    leaf: (<><path d="M21 3c0 9-6 15-15 15H4v-2C4 7 10 3 21 3Z" /><path d="M4 20 12 12" /></>),
    truck: (<><rect x="1" y="7" width="14" height="10" rx="1" /><path d="M15 10h4l3 3v4h-7v-7Z" /><circle cx="6" cy="19" r="1.6" /><circle cx="17.5" cy="19" r="1.6" /></>),
    sparkle: (<><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></>),
  };
  return <svg {...common}>{paths[name] ?? paths.sparkle}</svg>;
}
