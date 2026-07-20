"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/lib/types";
import { ShopCategory } from "@/lib/categories-db";

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "newest", label: "Newest" },
];

const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

const colorHex: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  red: "#ef4444",
  navy: "#172554",
  blue: "#3b82f6",
  grey: "#9ca3af",
  gray: "#9ca3af",
  olive: "#6b7a3c",
  coral: "#fb7185",
  ivory: "#fff7ed",
  brown: "#92400e",
};

const toggleValue = (list: string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export default function ShopClient({
  products,
  categories,
}: {
  products: Product[];
  categories: ShopCategory[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const allowedCategories = useMemo(() => new Set(categories.map((item) => item.slug)), [categories]);
  const initialCategory = searchParams.get("category");
  const highestPrice = useMemo(
    () => Math.max(1000, Math.ceil(Math.max(...products.map((product) => product.price), 0) / 1000) * 1000),
    [products]
  );

  const [category, setCategory] = useState(
    initialCategory && allowedCategories.has(initialCategory) ? initialCategory : "all"
  );
  const [search, setSearch] = useState((searchParams.get("search") || "").trim());
  const [sort, setSort] = useState("featured");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(highestPrice);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [onSale, setOnSale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const requested = searchParams.get("category");
    setCategory(requested && allowedCategories.has(requested) ? requested : "all");
    setSearch((searchParams.get("search") || "").trim());
  }, [searchParams, allowedCategories]);

  const colors = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.colors))).sort(),
    [products]
  );
  const sizes = useMemo(
    () =>
      Array.from(new Set(products.flatMap((product) => product.sizes))).sort((a, b) => {
        const aIndex = sizeOrder.indexOf(a);
        const bIndex = sizeOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }),
    [products]
  );

  const categoryCount = (slug: string) => products.filter((product) => product.category === slug).length;
  const colorCount = (color: string) => products.filter((product) => product.colors.includes(color)).length;
  const sizeCount = (size: string) => products.filter((product) => product.sizes.includes(size)).length;

  const selectCategory = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("category");
    else params.set("category", value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    let list = category === "all" ? [...products] : products.filter((product) => product.category === category);
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((product) =>
        `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(query)
      );
    }
    if (selectedColors.length)
      list = list.filter((product) => selectedColors.some((color) => product.colors.includes(color)));
    if (selectedSizes.length)
      list = list.filter((product) => selectedSizes.some((size) => product.sizes.includes(size)));
    list = list.filter((product) => product.price >= minPrice && product.price <= maxPrice);
    if (onSale) list = list.filter((product) => Boolean(product.compareAtPrice && product.compareAtPrice > product.price));
    if (inStock) list = list.filter((product) => product.stock > 0);

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
        list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return list;
  }, [category, inStock, maxPrice, minPrice, onSale, products, search, selectedColors, selectedSizes, sort]);

  const hasFilters =
    category !== "all" ||
    search.trim() !== "" ||
    minPrice > 0 ||
    maxPrice < highestPrice ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    onSale ||
    inStock;

  const clearFilters = () => {
    setCategory("all");
    setSearch("");
    setMinPrice(0);
    setMaxPrice(highestPrice);
    setSelectedColors([]);
    setSelectedSizes([]);
    setOnSale(false);
    setInStock(false);
    router.push(pathname, { scroll: false });
  };

  const categoryLabel = categories.find((item) => item.slug === category)?.name;
  const heading = search.trim()
    ? `Search results for “${search.trim()}”`
    : category === "all"
      ? "All Products"
      : `${categoryLabel || "Category"} Collection`;

  const minPercent = (minPrice / highestPrice) * 100;
  const maxPercent = (maxPrice / highestPrice) * 100;

  const filters = (
    <div className="space-y-8">
      <FilterSection title="Search">
        <div className="relative">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-navy-800/15 bg-white py-2.5 pl-3 pr-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            placeholder="Search products…"
            aria-label="Filter products by search"
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy-800/50" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </div>
      </FilterSection>

      <FilterSection title="Product categories">
        <div className="space-y-3">
          <RadioFilter
            label="All products"
            count={products.length}
            checked={category === "all"}
            onChange={() => selectCategory("all")}
          />
          {categories.map((item) => (
            <RadioFilter
              key={item.slug}
              label={item.name}
              count={categoryCount(item.slug)}
              checked={category === item.slug}
              onChange={() => selectCategory(item.slug)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Filter by price">
        <div className="relative mt-2 h-6">
          <div className="absolute left-0 right-0 top-2.5 h-1 rounded-full bg-navy-800/15" />
          <div
            className="absolute top-2.5 h-1 rounded-full bg-navy-800"
            style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max={highestPrice}
            step="100"
            value={minPrice}
            onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice - 100))}
            className="shop-range absolute inset-0 w-full"
            aria-label="Minimum price"
          />
          <input
            type="range"
            min="0"
            max={highestPrice}
            step="100"
            value={maxPrice}
            onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice + 100))}
            className="shop-range absolute inset-0 w-full"
            aria-label="Maximum price"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-navy-800/60">
          <span>Price: LKR {minPrice.toLocaleString()}</span>
          <span>LKR {maxPrice.toLocaleString()}</span>
        </div>
      </FilterSection>

      <FilterSection title="Filter by color">
        <div className="space-y-3">
          {colors.map((color) => (
            <label key={color} className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800/75">
              <input
                type="checkbox"
                checked={selectedColors.includes(color)}
                onChange={() => setSelectedColors((current) => toggleValue(current, color))}
                className="h-4 w-4 rounded border-navy-800/30 accent-brand"
              />
              <span
                className="h-3.5 w-3.5 rounded-full border border-navy-800/15"
                style={{ backgroundColor: colorHex[color.toLowerCase()] || color.toLowerCase() }}
              />
              <span>{color} <span className="text-navy-800/40">({colorCount(color)})</span></span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Filter by size">
        <div className="space-y-3">
          {sizes.map((size) => (
            <label key={size} className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800/75">
              <input
                type="checkbox"
                checked={selectedSizes.includes(size)}
                onChange={() => setSelectedSizes((current) => toggleValue(current, size))}
                className="h-4 w-4 rounded border-navy-800/30 accent-brand"
              />
              <span>{size} <span className="text-navy-800/40">({sizeCount(size)})</span></span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Stock status">
        <div className="space-y-3">
          <CheckFilter
            label="On sale"
            count={products.filter((product) => Boolean(product.compareAtPrice && product.compareAtPrice > product.price)).length}
            checked={onSale}
            onChange={() => setOnSale((value) => !value)}
          />
          <CheckFilter
            label="In stock"
            count={products.filter((product) => product.stock > 0).length}
            checked={inStock}
            onChange={() => setInStock((value) => !value)}
          />
        </div>
      </FilterSection>

      {hasFilters && (
        <button onClick={clearFilters} className="w-full rounded-lg border border-navy-800/15 px-4 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-brand hover:text-brand">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container-x py-8 sm:py-10">
      <div className="mb-7">
        <nav className="text-sm text-navy-800/50">
          <span>Home</span> <span className="mx-1">/</span> <span className="text-navy-800">Shop</span>
        </nav>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy-800 sm:text-4xl">{heading}</h1>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-navy-800/10 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-800/15 px-4 py-2 text-sm font-semibold text-navy-800 lg:hidden"
            aria-expanded={mobileFiltersOpen}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
          </button>
          <p className="text-sm text-navy-800/60">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="hidden text-sm font-semibold text-brand hover:text-brand-700 sm:inline">
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-navy-800/60">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded-lg border border-navy-800/15 bg-white px-3 py-2 text-sm font-medium text-navy-800 outline-none focus:border-brand"
          >
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${mobileFiltersOpen ? "block" : "hidden"} rounded-2xl border border-navy-800/10 bg-navy-50/40 p-5 lg:block lg:self-start lg:sticky lg:top-28`}>
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <h2 className="font-semibold text-navy-800">Filters</h2>
            <button onClick={() => setMobileFiltersOpen(false)} className="text-sm font-semibold text-navy-800/60">Close</button>
          </div>
          {filters}
        </aside>

        <main className="min-w-0">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[360px]:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="rounded-2xl bg-navy-50 py-20 text-center">
              <p className="font-semibold text-navy-800">No products match these filters.</p>
              <button onClick={clearFilters} className="mt-3 text-sm font-semibold text-brand">Clear all filters</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-navy-800">{title}</h2>
      {children}
    </section>
  );
}

function RadioFilter({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800/75">
      <input type="radio" name="shop-category" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand" />
      <span>{label} <span className="text-navy-800/40">({count})</span></span>
    </label>
  );
}

function CheckFilter({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800/75">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-navy-800/30 accent-brand" />
      <span>{label} <span className="text-navy-800/40">({count})</span></span>
    </label>
  );
}
