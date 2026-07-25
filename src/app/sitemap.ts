import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products-db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: new URL("/", SITE_URL).toString(), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: new URL("/shop", SITE_URL).toString(), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: new URL("/promotions", SITE_URL).toString(), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: new URL("/about", SITE_URL).toString(), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: new URL("/contact", SITE_URL).toString(), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const products = await getAllProducts();
  return [
    ...staticPages,
    ...products.map((product) => ({
      url: new URL(`/product/${product.slug}`, SITE_URL).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: [new URL(product.image, SITE_URL).toString()],
    })),
  ];
}
