import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/lib/products-db";
import ProductDetail from "./ProductDetail";
import ProductCard from "@/components/ProductCard";
import SectionHeader from "@/components/SectionHeader";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.slug, product.category);

  return (
    <div className="container-x py-10">
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
