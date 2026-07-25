import { Product } from "@/lib/types";

export function productBadges(product: Product): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  if (discount > 0) badges.push({ label: `-${discount}%`, className: "bg-[#a94700] text-white" });
  if (product.stock > 0 && product.stock <= 5) badges.push({ label: "Low Stock", className: "bg-red-600 text-white" });
  if (product.badge === "New") badges.push({ label: "New", className: "bg-navy-800 text-white" });
  if (product.badge === "Bestseller" || (product.rating >= 4.7 && product.reviews >= 10)) {
    badges.push({ label: "Best Seller", className: "bg-brand-100 text-brand-700" });
  }
  if (!badges.length && product.badge === "Sale") {
    badges.push({ label: "Sale", className: "bg-[#a94700] text-white" });
  }
  return badges.slice(0, 2);
}

export default function ProductBadges({ product }: { product: Product }) {
  const badges = productBadges(product);
  if (!badges.length) return null;
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
      {badges.map((badge) => (
        <span key={badge.label} className={`badge shadow-sm ${badge.className}`}>{badge.label}</span>
      ))}
    </div>
  );
}
