import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/lib/products-db";
import ProductDetail from "./ProductDetail";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth";

function seoDescription(value: string): string {
  return value
    .replace(/[*_#`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const title = product.metaTitle?.trim() || product.name;
  const description = seoDescription(product.metaDescription?.trim() || product.description);
  const keywords = product.metaKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  const fallbackKeywords = [
    `${product.name} Sri Lanka`,
    `${product.category} t shirts Sri Lanka`,
    "oversized t shirts Sri Lanka",
    "graphic t shirts Sri Lanka",
  ];
  return {
    title,
    description,
    keywords: keywords?.length ? keywords : fallbackKeywords,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/product/${product.slug}`,
      siteName: SITE_NAME,
      images: [{ url: product.image, alt: product.imageAlt || product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const resellerOnly = user?.role === "reseller";
  const product = await getProductBySlug(slug, resellerOnly);
  if (!product) notFound();

  const related = await getRelatedProducts(product.slug, product.category, resellerOnly);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: [product.image, ...product.images].map((image) => new URL(image, SITE_URL).toString()),
    keywords: product.metaKeywords || undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: new URL(`/product/${product.slug}`, SITE_URL).toString(),
      priceCurrency: "LKR",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="container-x py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <nav className="mb-8 text-sm text-navy-800/50">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span className="mx-1">/</span>
        <Link href="/shop" className="hover:text-brand">
          Shop
        </Link>
        <span className="mx-1">/</span>
        <span className="text-navy-800">{product.name}</span>
      </nav>

      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeader eyebrow="You May Also Like" title="Related Products" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
