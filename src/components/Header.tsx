"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/store/cart";
import { useAuth } from "@/context/AuthProvider";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=men", label: "Men" },
  { href: "/shop?category=women", label: "Women" },
  { href: "/shop?category=accessories", label: "Accessories" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
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

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all ${
        scrolled
          ? "border-navy-800/10 bg-white/90 backdrop-blur-md"
          : "border-transparent bg-white"
      }`}
    >
      <div className="container-x flex h-20 items-center justify-between gap-4">
        {/* Mobile menu button */}
        <button
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Beyos Clothing"
            width={140}
            height={140}
            className="h-14 w-14 object-contain"
            priority
          />
          <span className="hidden text-xl font-bold tracking-tight text-navy-800 sm:block">
            Beyos<span className="text-brand"> Clothing</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-navy-800/80 transition hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
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
                  <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-xl border border-navy-800/10 bg-white py-1 shadow-lg">
                    <div className="border-b border-navy-800/10 px-4 py-2">
                      <p className="truncate text-sm font-semibold text-navy-800">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-navy-800/50">
                        {user.email}
                      </p>
                    </div>
                    {user.role === "reseller" ? (
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
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-navy-800/10 bg-white lg:hidden">
          <div className="container-x flex flex-col py-2">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg px-2 py-3 text-sm font-medium text-navy-800 hover:bg-navy-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
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

function UserIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
