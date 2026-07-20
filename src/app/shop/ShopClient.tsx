"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { Category, Product } from "@/lib/types";

const categoryTabs: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "accessories", label: "Accessories" },
];

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
];

export default function ShopClient({ products }: { products: Product[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialCategory = (searchParams.get("category") || "all") as
    | "all"
    | Category;
  const [category, setCategory] = useState<"all" | Category>(initialCategory);
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    setCategory((searchParams.get("category") || "all") as "all" | Category);
  }, [searchParams]);

  const selectCategory = (value: "all" | Category) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("category");
    else params.set("category", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    let list =
      category === "all"
        ? [...products]
        : products.filter((p) => p.category === category);

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        list.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    }
    return list;
  }, [category, sort, products]);

  const heading =
    category === "all"
      ? "All Products"
      : categoryTabs.find((t) => t.value === category)?.label + "'s Collection";

  return (
    <div className="container-x py-10">
      {/* Page header */}
      <div className="mb-8">
        <nav className="text-sm text-navy-800/50">
          <span>Home</span> <span className="mx-1">/</span>{" "}
          <span className="text-navy-800">Shop</span>
        </nav>
        <h1 className="mt-2 font-display text-4xl font-bold text-navy-800">
          {heading}
        </h1>
        <p className="mt-2 text-navy-800/60">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 flex flex-col gap-4 border-y border-navy-800/10 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {categoryTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => selectCategory(tab.value)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                category === tab.value
                  ? "bg-navy-800 text-white"
                  : "bg-navy-50 text-navy-800 hover:bg-navy-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-navy-800/60">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-navy-800/15 bg-white px-3 py-2 text-sm font-medium text-navy-800 outline-none focus:border-brand"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="py-20 text-center text-navy-800/50">
          No products found in this category.
        </p>
      )}
    </div>
  );
}
