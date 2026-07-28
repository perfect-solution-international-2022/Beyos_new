"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/store/cart";
import { useAuth } from "@/context/AuthProvider";
import type { ProductSearchSuggestion } from "@/lib/products-db";
import { formatPrice } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/promotions", label: "Promotions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const openCart = useCart((s) => s.openCart);
  const totalItems = useCart((s) => s.totalItems());
  const { user, logout } = useAuth();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await fetch(`/api/products?search=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        setSuggestions(response.ok && Array.isArray(data.products) ? data.products.slice(0, 5) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop");
    setMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all ${
        scrolled
          ? "border-white/60 bg-white/65 shadow-[0_12px_40px_rgba(9,23,34,.10)] backdrop-blur-2xl"
          : "border-white/40 bg-[#f7f9fb]/80 backdrop-blur-xl"
      }`}
    >
      <div className="container-x relative flex h-20 items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        {/* Logo */}
        <Link href="/" className="absolute left-1/2 flex -translate-x-1/2 shrink-0 items-center gap-2 lg:static lg:translate-x-0">
          <Image
            src="/images/logo.png"
            alt="Beyos Clothing"
            width={56}
            height={56}
            sizes="56px"
            quality={60}
            className="h-14 w-14 object-contain"
            priority
          />
          <span className="hidden text-xl font-bold tracking-tight text-navy-800 lg:block">
            Beyos<span className="text-brand-500"> Clothing</span>
          </span>
        </Link>

        {/* Desktop search */}
        <div className="relative mx-auto hidden max-w-xl flex-1 lg:block">
          <form onSubmit={handleSearch} className="liquid-glass flex items-center overflow-hidden rounded-xl">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="What are you looking for?"
              aria-label="Search products"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-navy-800 outline-none placeholder:text-navy-800/40"
            />
            <button type="submit" className="m-1 rounded-md bg-navy-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand">Search</button>
          </form>
          <SearchSuggestions query={search} open={searchFocused && search.trim().length >= 2} loading={suggestionsLoading} products={suggestions} onSelect={() => setSearchFocused(false)} />
        </div>

        <div className="hidden shrink-0 items-center gap-2.5 xl:flex">
          <PhoneIcon />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-navy-800">
              Hotline: <a href="tel:+94743191200" className="hover:text-brand">+94 74 319 1200</a>
            </span>
            <span className="text-[11px] text-navy-800/50">Pickup your order for free</span>
          </div>
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-1 lg:flex">
          {/* Account */}
          <div className="relative">
            {mounted && user ? (
              <>
                <button
                  aria-label="Account menu"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex h-10 items-center gap-2 rounded-lg px-2 text-navy-800 hover:bg-navy-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium sm:block">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-navy-800/10 bg-white py-1 shadow-[0_16px_40px_rgba(9,23,34,.18)]">
                    <div className="border-b border-navy-800/10 px-4 py-2">
                      <p className="truncate text-sm font-semibold text-navy-800">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-navy-800/50">
                        {user.email}
                      </p>
                    </div>
                    {user.role === "admin" ? (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm font-medium text-brand hover:bg-navy-50"
                      >
                        Admin Dashboard
                      </Link>
                    ) : user.role === "reseller" ? (
                      <Link
                        href="/reseller"
                        className="block px-4 py-2 text-sm font-medium text-brand hover:bg-navy-50"
                      >
                        Reseller Portal
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        className="block px-4 py-2 text-sm text-navy-800 hover:bg-navy-50"
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/checkout"
                      className="block px-4 py-2 text-sm text-navy-800 hover:bg-navy-50"
                    >
                      Checkout
                    </Link>
                    <button
                      onClick={async () => {
                        await logout();
                        setAccountOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-brand hover:bg-navy-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50"
              >
                <UserIcon />
              </Link>
            )}
          </div>
          <button
            aria-label="Open cart"
            onClick={openCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50"
          >
            <BagIcon />
            {mounted && totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        <button
          aria-label="Open cart"
          onClick={openCart}
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 lg:hidden"
        >
          <BagIcon />
          {mounted && totalItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Mobile search */}
      <div className="container-x relative mb-3 lg:hidden">
        <form onSubmit={handleSearch} className="liquid-glass flex items-center overflow-hidden rounded-xl">
          <SearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search products..."
            aria-label="Search products"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-navy-800 outline-none placeholder:text-navy-800/40"
          />
          <button type="submit" className="m-1 rounded-md bg-navy-900 px-3 py-2 text-sm font-semibold text-white min-[360px]:px-4">Search</button>
        </form>
        <SearchSuggestions query={search} open={searchFocused && search.trim().length >= 2} loading={suggestionsLoading} products={suggestions} onSelect={() => setSearchFocused(false)} />
      </div>

      {/* Desktop navigation */}
      <nav className="hidden border-t border-navy-800/5 lg:block">
        <div className="container-x flex items-center gap-8 py-2.5">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-navy-800/80 transition hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile and tablet navigation drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex h-[100dvh] w-[86%] max-w-sm flex-col overflow-hidden border-r border-navy-800/10 bg-white shadow-[20px_0_70px_rgba(9,23,34,.28)]" aria-label="Mobile navigation">
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-navy-800/10 px-5">
              <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
                <Image src="/images/logo.png" alt="Beyos Clothing" width={48} height={48} sizes="48px" quality={60} className="h-12 w-12 object-contain" />
                <span className="text-lg font-bold text-navy-800">Beyos <span className="text-brand">Clothing</span></span>
              </Link>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" title="Close menu" className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50">
                <MenuIcon open />
              </button>
            </div>

            {mounted && user ? (
              <div className="border-b border-navy-800/10 bg-navy-50/70 px-5 py-4">
                <p className="text-sm font-semibold text-navy-800">{user.name}</p>
                <p className="mt-0.5 truncate text-xs text-navy-800/50">{user.email}</p>
                <Link href={user.role === "admin" ? "/admin" : user.role === "reseller" ? "/reseller" : "/dashboard"} className="mt-3 inline-flex text-sm font-semibold text-brand" onClick={() => setMenuOpen(false)}>
                  {user.role === "admin" ? "Admin Dashboard" : user.role === "reseller" ? "Reseller Portal" : "My Account"} <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 border-b border-navy-800/10 px-5 py-4">
                <Link href="/login" className="btn-outline text-center" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/register" className="btn-primary text-center" onClick={() => setMenuOpen(false)}>Register</Link>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              {nav.map((item, index) => (
                <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className={`flex items-center justify-between border-b border-navy-800/5 px-3 py-4 text-base font-semibold transition ${pathname === item.href ? "text-brand" : "text-navy-800 hover:text-brand"}`}>
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="text-navy-800/25">{String(index + 1).padStart(2, "0")}</span>
                </Link>
              ))}
              <Link href="/checkout" onClick={() => setMenuOpen(false)} className="mt-4 flex items-center justify-between bg-navy-900 px-4 py-3.5 text-sm font-semibold text-white">
                <span>Go to Checkout</span><span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="shrink-0 border-t border-navy-800/10 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <a href="tel:+94743191200" className="block text-sm font-semibold text-navy-800">Hotline: +94 74 319 1200</a>
              {mounted && user && <button type="button" onClick={async () => { await logout(); setMenuOpen(false); }} className="mt-3 text-sm font-semibold text-red-600">Sign out</button>}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="ml-4 shrink-0 text-navy-800/45" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function SearchSuggestions({ query, open, loading, products, onSelect }: { query: string; open: boolean; loading: boolean; products: ProductSearchSuggestion[]; onSelect: () => void }) {
  if (!open) return null;
  return (
    <div className="liquid-glass absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl">
      {loading ? (
        <p className="px-4 py-5 text-center text-sm text-navy-800/50">Searching...</p>
      ) : products.length ? (
        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto py-1">
          {products.map((product) => (
            <Link key={product.id} href={`/product/${product.slug}`} onClick={onSelect} className="flex items-center gap-3 border-b border-navy-800/5 px-3 py-2.5 transition last:border-0 hover:bg-navy-50">
              <Image src={product.image} alt="" width={48} height={48} sizes="48px" className="h-12 w-12 shrink-0 rounded-md object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy-800">{product.name}</span>
                <span className="mt-0.5 block text-xs font-bold text-brand-600">{formatPrice(product.price)}</span>
              </span>
              <span aria-hidden="true" className="text-navy-800/30">→</span>
            </Link>
          ))}
          <Link href={`/shop?search=${encodeURIComponent(query)}`} onClick={onSelect} className="block px-4 py-3 text-center text-sm font-semibold text-navy-800 hover:text-brand">View all results</Link>
        </div>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-navy-800/50">No matching products</p>
      )}
    </div>
  );
}
