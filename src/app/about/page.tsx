import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Beyos Clothing, our vision, mission, and commitment to premium custom T-shirt printing.",
};

const visionMission = [
  {
    icon: "◉",
    title: "Our Vision",
    description:
      "To become a trusted and innovative clothing brand that inspires self-expression through high-quality, creative, and affordable custom T-shirt printing.",
  },
  {
    icon: "◎",
    title: "Our Mission",
    description:
      "Our mission is to deliver premium DTF printed T-shirts with vibrant designs, lasting quality, and exceptional service—helping individuals, businesses, and communities bring their ideas to life through fashion.",
  },
];

const reasons = [
  { icon: "◇", title: "Premium Fabrics" },
  { icon: "♧", title: "Sustainable Sourcing" },
  { icon: "→", title: "Fast Shipping" },
  { icon: "✦", title: "Unique Designs" },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-brand py-14 text-center text-white sm:py-20">
        <div className="container-x">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">About Us</h1>
          <p className="mt-2 text-sm text-white/90">Style For The Modern You</p>
        </div>
      </section>

      <section className="container-x py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-12">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[490px] overflow-hidden rounded-2xl bg-navy-50 lg:mx-0">
            <Image src="/images/about/about-image.jpeg" alt="About Beyos Clothing" fill className="object-cover" priority />
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-navy-800 sm:text-3xl">
              About Beyos Clothing Brand
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-navy-800/70">
              <p>
                Beyos Clothing is a custom T-shirt printing brand delivering stylish, high-quality designs for everyday wear. We turn your ideas into wearable art with premium prints and comfortable fabrics.
              </p>
              <p>
                Beyos Clothing specializes in high-quality DTF T-shirt printing, delivering bold designs, vibrant colors, and long-lasting prints. Perfect for personal wear, businesses, events, and custom orders.
              </p>
              <p>
                We create premium DTF printed T-shirts with sharp details, rich colors, and durable quality. From custom designs to bulk orders, we turn your ideas into wearable style.
              </p>
              <p>
                At Beyos Clothing, fashion meets creativity. We offer custom DTF T-shirt printing with eye-catching designs, smooth finishes, and long-lasting quality.
              </p>
            </div>
            <Link href="/shop" className="btn-primary mt-7">Shop Collection</Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f5f5f5] py-12 sm:py-16">
        <div className="container-x">
          <h2 className="text-center font-display text-2xl font-bold text-navy-800 sm:text-3xl">Vision and Mission</h2>
          <div className="mt-9 grid gap-6 md:grid-cols-2">
            {visionMission.map((item) => (
              <article key={item.title} className="rounded-2xl bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl font-bold text-brand" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="mt-4 text-base font-bold text-navy-800">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-navy-800/60">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-12 sm:py-16 lg:py-20">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-navy-800 sm:text-3xl">Why Choose Us</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-navy-800/55">
            We prioritize quality, ethics, and your experience above all else. Every choice we make is designed to provide you with clothing you can be proud to wear.
          </p>
        </div>
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((item) => (
            <article key={item.title} className="rounded-2xl bg-white p-7 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-1 ring-navy-800/5">
              <span className="text-3xl text-brand" aria-hidden="true">{item.icon}</span>
              <h3 className="mt-4 font-bold text-navy-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-navy-800/60">
                Quality materials, thoughtful craftsmanship, and dependable service in every Beyos product.
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
