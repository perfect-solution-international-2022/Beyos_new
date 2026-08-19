"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/store/cart";
import { useAuth } from "@/context/AuthProvider";

export default function MobileBottomNav() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const openCart = useCart((s) => s.openCart);
  const cartOpen = useCart((s) => s.isOpen);
  const totalItems = useCart((s) => s.totalItems());
  const { user } = useAuth();

  const accountHref = !user
    ? "/login"
    : user.role === "admin"
      ? "/admin"
      : user.role === "reseller"
        ? "/reseller"
        : "/dashboard";

  useEffect(() => setMounted(true), []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-3 bottom-[max(.6rem,env(safe-area-inset-bottom))] z-40 flex h-[62px] items-stretch gap-1 overflow-hidden rounded-[1.65rem] border border-white/35 bg-[linear-gradient(135deg,rgba(24,50,72,.82),rgba(6,22,36,.9))] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.38),inset_0_-1px_0_rgba(255,255,255,.08),0_18px_44px_rgba(5,18,30,.32),0_4px_12px_rgba(5,18,30,.2)] ring-1 ring-navy-900/10 backdrop-blur-[28px] backdrop-saturate-150 lg:hidden"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -left-8 -top-12 h-24 w-48 rotate-[-10deg] rounded-full bg-white/10 blur-2xl" />
      <Link
        href="/"
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[1.3rem] text-[9px] font-semibold transition-all duration-300 ${
          isActive("/") ? "border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07))] text-brand-400 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_5px_16px_rgba(0,0,0,.16)]" : "border border-transparent text-white/75 hover:bg-white/[.07] hover:text-white"
        }`}
      >
        <HomeIcon />
        Home
      </Link>

      <Link
        href="/shop"
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[1.3rem] text-[9px] font-semibold transition-all duration-300 ${
          isActive("/shop") ? "border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07))] text-brand-400 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_5px_16px_rgba(0,0,0,.16)]" : "border border-transparent text-white/75 hover:bg-white/[.07] hover:text-white"
        }`}
      >
        <ShopIcon />
        Shop
      </Link>

      <button
        onClick={openCart}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[1.3rem] text-[9px] font-semibold transition-all duration-300 ${
          cartOpen
            ? "border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07))] text-brand-400 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_5px_16px_rgba(0,0,0,.16)]"
            : "border border-transparent text-white/75 hover:bg-white/[.07] hover:text-white"
        }`}
        aria-label={mounted && totalItems > 0 ? `Open cart with ${totalItems} items` : "Open cart"}
      >
        <span className="relative">
          <BagIcon />
          {mounted && totalItems > 0 && (
            <span className="absolute -right-2.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-navy-900">
              {totalItems}
            </span>
          )}
        </span>
        Cart
      </button>

      <Link
        href={accountHref}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-[1.3rem] text-[9px] font-semibold transition-all duration-300 ${
          isActive("/admin") || isActive("/reseller") || isActive("/dashboard") || isActive("/login")
            ? "border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,.07))] text-brand-400 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_5px_16px_rgba(0,0,0,.16)]"
            : "border border-transparent text-white/75 hover:bg-white/[.07] hover:text-white"
        }`}
      >
        <UserIcon />
        Account
      </Link>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9 4 4h16l1 5" />
      <path d="M4 9v11h16V9" />
      <path d="M3 9h18" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
