"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

interface Leaf { label: string; href: string; }
interface Item { label: string; icon: string; href?: string; children?: Leaf[]; }
interface Section { title: string; items: Item[]; }

const sections: Section[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: "grid", href: "/admin" }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", icon: "tag", children: [
        { label: "All Products", href: "/admin/products" },
        { label: "Create Product", href: "/admin/products/new" },
      ] },
      { label: "Category", icon: "folder", href: "/admin/categories" },
      { label: "Attributes", icon: "sliders", href: "/admin/attributes" },
      { label: "Inventory", icon: "box", children: [
        { label: "Product Stock", href: "/admin/inventory" },
        { label: "Low Stock Alerts", href: "/admin/inventory/low-stock" },
      ] },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", icon: "cart", children: [
        { label: "All Orders", href: "/admin/orders" },
        { label: "Pending Orders", href: "/admin/orders/pending" },
      ] },
      { label: "POS", icon: "terminal", children: [
        { label: "POS", href: "/admin/pos" },
        { label: "Sales", href: "/admin/pos/sales" },
      ] },
      { label: "Promotions", icon: "percent", href: "/admin/promotions" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Resellers", icon: "store", href: "/admin/resellers" },
      { label: "Customers", icon: "users", href: "/admin/customers" },
      { label: "Users", icon: "user", href: "/admin/users" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Withdraw", icon: "cash", children: [
        { label: "Pending Withdrawals", href: "/admin/withdrawals/pending" },
        { label: "Withdraw History", href: "/admin/withdrawals/history" },
      ] },
      { label: "Reports", icon: "chart", children: [
        { label: "Sales Report", href: "/admin/reports" },
        { label: "Item Report", href: "/admin/reports/item" },
      ] },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Delivery Pricing", icon: "gear", href: "/admin/delivery-pricing" },
      { label: "Settings", icon: "gear", href: "/admin/settings" },
    ],
  },
];

interface SearchEntry { label: string; href: string; group: string; }

const searchIndex: SearchEntry[] = sections.flatMap((s) =>
  s.items.flatMap((item) =>
    item.children
      ? item.children.map((c) => ({ label: c.label, href: c.href, group: item.label }))
      : [{ label: item.label, href: item.href!, group: s.title }]
  )
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?redirect=/admin");
    else if (user.role !== "admin") router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    sections.forEach((s) =>
      s.items.forEach((item) => {
        if (item.children?.some((c) => pathname === c.href.split("?")[0])) {
          setOpenGroups((g) => (g.includes(item.label) ? g : [...g, item.label]));
        }
      })
    );
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchIndex
      .filter((e) => e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query]);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex min-h-screen items-center justify-center bg-navy-50 text-navy-800/50">Loading admin…</div>;
  }

  if (pathname === "/admin/pos") {
    return <div className="min-h-screen bg-[#f5f6f8]">{children}</div>;
  }

  const toggleGroup = (label: string) =>
    setOpenGroups((g) => (g.includes(label) ? g.filter((x) => x !== label) : [...g, label]));
  const isActive = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base;
  };
  const groupActive = (item: Item) => item.children?.some((c) => isActive(c.href)) ?? false;

  const goTo = (href: string) => {
    setQuery("");
    setSearchFocused(false);
    router.push(href);
  };

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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg shadow-brand/20">
            <Image src="/images/logo.png" alt="Beyos" width={40} height={40} className="h-8 w-8 object-contain" />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">BEYOS</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Admin Panel</p>
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
              <p className="truncate text-[11px] text-white/40">Administrator</p>
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

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-navy-900/50 backdrop-blur-sm lg:hidden" />}

      {/* ── Main column ── */}
      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-3 border-b border-navy-800/[0.07] bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen((v) => !v)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-navy-800 hover:bg-navy-50 lg:hidden" aria-label="Toggle sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold text-navy-800">Welcome back, {user.name.split(" ")[0]} 👋</p>
              <p className="hidden text-xs text-navy-800/40 sm:block">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Quick find */}
            <div ref={searchRef} className="relative hidden md:block">
              <div className={`flex items-center gap-2 rounded-xl border bg-navy-50/60 px-3 py-2 transition ${searchFocused ? "border-brand/40 bg-white ring-2 ring-brand/15" : "border-transparent"}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-navy-800/35"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(e) => { if (e.key === "Enter" && results[0]) goTo(results[0].href); if (e.key === "Escape") { setQuery(""); setSearchFocused(false); } }}
                  placeholder="Quick find…"
                  className="w-40 bg-transparent text-sm text-navy-800 outline-none placeholder:text-navy-800/35 lg:w-52"
                />
              </div>
              {searchFocused && query.trim() && (
                <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-navy-800/10 bg-white py-1.5 shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-navy-800/40">No pages match “{query}”</p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.href + r.label}
                        onClick={() => goTo(r.href)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-navy-50"
                      >
                        <span className="text-sm font-medium text-navy-800">{r.label}</span>
                        <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-800/45">{r.group}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* POS quick access */}
            <Link
              href="/admin/pos"
              className="flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:bg-brand/90"
            >
              <NavIcon name="terminal" />
              <span className="hidden sm:inline">POS</span>
            </Link>

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
                  <Link href="/admin/settings" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-navy-800 transition hover:bg-navy-50">Settings</Link>
                  <Link href="/" className="block px-4 py-2.5 text-sm text-navy-800 transition hover:bg-navy-50">Storefront</Link>
                  <button onClick={async () => { await logout(); router.push("/"); }} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-brand transition hover:bg-navy-50">Sign out</button>
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
  const c = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    grid: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
    tag: (<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
    folder: (<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />),
    cart: (<><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>),
    sliders: (<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>),
    box: (<><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></>),
    store: (<><path d="M3 9 4 4h16l1 5" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></>),
    users: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>),
    user: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
    cash: (<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>),
    percent: (<><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>),
    terminal: (<><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>),
    chart: (<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
    gear: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
    logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  };
  return <svg {...c}>{paths[name] ?? paths.grid}</svg>;
}
