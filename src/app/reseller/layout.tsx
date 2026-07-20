"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

interface NavLeaf { href: string; label: string; }
interface NavItem { label: string; icon: string; href?: string; children?: NavLeaf[]; }
interface Section { title: string; items: NavItem[]; }

const sections: Section[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: "grid", href: "/reseller" }],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", icon: "cart", children: [
        { href: "/reseller/orders", label: "All Orders" },
        { href: "/reseller/orders/pending", label: "Pending Orders" },
        { href: "/reseller/orders/new", label: "New Order" },
      ] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Withdrawals", icon: "cash", children: [
        { href: "/reseller/withdrawals/pending", label: "Pending Withdrawals" },
        { href: "/reseller/withdrawals/history", label: "Withdraw History" },
        { href: "/reseller/withdrawals/new", label: "Create Withdraw" },
      ] },
      { label: "My Wallet", icon: "wallet", href: "/reseller/wallet" },
      { label: "Bank Details", icon: "bank", href: "/reseller/bank" },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", icon: "gear", href: "/reseller/settings" }],
  },
];

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(["Orders"]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Guard: reseller-only.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?redirect=/reseller");
    else if (user.role !== "reseller") router.replace("/dashboard");
  }, [loading, user, router]);

  // Auto-open the group that matches the current route.
  useEffect(() => {
    sections.forEach((s) =>
      s.items.forEach((item) => {
        if (item.children?.some((c) => pathname.startsWith(c.href))) {
          setOpenGroups((g) => (g.includes(item.label) ? g : [...g, item.label]));
        }
      })
    );
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading || !user || user.role !== "reseller") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 text-navy-800/50">
        Loading reseller portal…
      </div>
    );
  }

  const toggleGroup = (label: string) =>
    setOpenGroups((g) => (g.includes(label) ? g.filter((x) => x !== label) : [...g, label]));

  const isActive = (href: string) =>
    href === "/reseller" ? pathname === "/reseller" : pathname.startsWith(href);
  const groupActive = (item: NavItem) => item.children?.some((c) => isActive(c.href)) ?? false;

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-gradient-to-b from-[#0a1a30] via-navy-900 to-[#0a1a30] text-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[68px] items-center gap-3 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-black text-white shadow-lg shadow-brand/30">B</span>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">BEYOS</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Reseller Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) =>
                  item.children ? (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleGroup(item.label)}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          groupActive(item) ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className={`transition ${groupActive(item) ? "text-brand" : "text-white/40 group-hover:text-white/70"}`}>
                          <NavIcon name={item.icon} />
                        </span>
                        <span>{item.label}</span>
                        {groupActive(item) && !openGroups.includes(item.label) && (
                          <span className="ml-auto mr-1 h-1.5 w-1.5 rounded-full bg-brand" />
                        )}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                          className={`${groupActive(item) && !openGroups.includes(item.label) ? "" : "ml-auto"} text-white/30 transition-transform ${openGroups.includes(item.label) ? "rotate-90" : ""}`}>
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                      </button>
                      {openGroups.includes(item.label) && (
                        <div className="ml-[21px] mt-0.5 space-y-0.5 border-l border-white/10 pl-3.5">
                          {item.children.map((c) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={`block rounded-lg px-3 py-2 text-[13px] transition ${
                                isActive(c.href)
                                  ? "bg-brand/15 font-semibold text-brand"
                                  : "text-white/50 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive(item.href!)
                          ? "bg-brand text-white shadow-lg shadow-brand/25"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className={`transition ${isActive(item.href!) ? "text-white" : "text-white/40 group-hover:text-white/70"}`}>
                        <NavIcon name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-white/40">Reseller</p>
            </div>
            <button
              onClick={async () => { await logout(); router.push("/"); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Logout"
              title="Logout"
            >
              <NavIcon name="logout" />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-navy-900/50 backdrop-blur-sm lg:hidden" />
      )}

      {/* ── Main column ── */}
      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-navy-800/[0.07] bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold text-navy-800">Welcome back, {user.name.split(" ")[0]} 👋</p>
              <p className="hidden text-xs text-navy-800/40 sm:block">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* New Order quick access — hidden when already creating an order. */}
            {pathname !== "/reseller/orders/new" && (
              <Link
                href="/reseller/orders/new"
                className="flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand/90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span className="hidden sm:inline">New Order</span>
              </Link>
            )}

            {/* Account menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-navy-50"
                aria-label="Account menu"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`hidden text-navy-800/40 transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-navy-800/10 bg-white py-1.5 shadow-xl">
                  <div className="border-b border-navy-800/10 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold text-navy-800">{user.name}</p>
                    <p className="truncate text-xs text-navy-800/50">{user.email}</p>
                  </div>
                  <Link href="/reseller/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-navy-800 transition hover:bg-navy-50">Settings</Link>
                  <Link href="/" className="block px-4 py-2.5 text-sm text-navy-800 transition hover:bg-navy-50">Storefront</Link>
                  <button
                    onClick={async () => { await logout(); router.push("/"); }}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-brand transition hover:bg-navy-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const c = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...c}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "cart":
      return (
        <svg {...c}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
      );
    case "cash":
      return (
        <svg {...c}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...c}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    case "gear":
      return (
        <svg {...c}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    case "bank":
      return (
        <svg {...c}>
          <line x1="3" y1="22" x2="21" y2="22" />
          <line x1="6" y1="18" x2="6" y2="11" />
          <line x1="10" y1="18" x2="10" y2="11" />
          <line x1="14" y1="18" x2="14" y2="11" />
          <line x1="18" y1="18" x2="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        </svg>
      );
    default:
      return (
        <svg {...c}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
  }
}
