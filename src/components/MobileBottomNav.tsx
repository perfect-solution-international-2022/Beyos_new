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
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/70 bg-white/65 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_-12px_32px_rgba(9,23,34,.12)] backdrop-blur-2xl lg:hidden">
      <Link
        href="/"
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
          isActive("/") ? "text-brand-600" : "text-navy-800/75"
        }`}
      >
        <HomeIcon />
        Home
      </Link>

      <Link
        href="/shop"
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
          isActive("/shop") ? "text-brand-600" : "text-navy-800/75"
        }`}
      >
        <ShopIcon />
        Shop
      </Link>

      <button
        onClick={openCart}
        className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-navy-800/75"
      >
        <span className="relative">
          <BagIcon />
          {mounted && totalItems > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {totalItems}
            </span>
          )}
        </span>
        Cart
      </button>

      <Link
        href={accountHref}
        className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
          isActive("/admin") || isActive("/reseller") || isActive("/dashboard") || isActive("/login")
            ? "text-brand-600"
            : "text-navy-800/75"
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
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9 4 4h16l1 5" />
      <path d="M4 9v11h16V9" />
      <path d="M3 9h18" />
      <path d="M9 20v-6h6v6" />
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

function UserIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
