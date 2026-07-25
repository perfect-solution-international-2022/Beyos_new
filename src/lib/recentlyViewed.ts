import { Product } from "@/lib/types";

export const RECENTLY_VIEWED_KEY = "beyos-recently-viewed";
export const RECENTLY_VIEWED_EVENT = "beyos:recently-viewed";

export function trackRecentlyViewed(product: Product) {
  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]") as Product[];
    const next = [product, ...current.filter((item) => item.slug !== product.slug)].slice(0, 8);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT));
  } catch {
    localStorage.removeItem(RECENTLY_VIEWED_KEY);
  }
}
