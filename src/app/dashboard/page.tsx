"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWishlist } from "@/context/WishlistProvider";
import { formatPrice } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

interface Order {
  orderRef: string;
  status: string;
  createdAt: string;
  total: number;
  items: { name: string; quantity: number }[];
}

export default function DashboardOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const wishlistCount = useWishlist().count;

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const total = orders.length;
  const pending = orders.filter((o) =>
    ["pending", "processing"].includes(o.status.toLowerCase())
  ).length;
  const completed = orders.filter((o) =>
    ["completed", "delivered"].includes(o.status.toLowerCase())
  ).length;

  const stats = [
    { label: "Total Orders", value: total, icon: "bag", tone: "blue" },
    { label: "Pending Orders", value: pending, icon: "clock", tone: "amber" },
    { label: "Completed Orders", value: completed, icon: "check", tone: "green" },
    { label: "Wishlist Items", value: wishlistCount, icon: "heart", tone: "red" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">My Dashboard</h1>
      <p className="mt-1 text-sm text-navy-800/50">
        Here&apos;s an overview of your account activity.
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-center">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full ${toneBg[s.tone]}`}
              >
                <StatIcon name={s.icon} className={toneText[s.tone]} />
              </span>
            </div>
            <p className="mt-4 text-center text-sm font-semibold uppercase tracking-wide text-navy-800/70">
              {s.label}
            </p>
            <p className={`mt-2 text-center text-4xl font-extrabold ${toneText[s.tone]}`}>
              {loading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mt-8 rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-sm font-semibold text-brand hover:underline"
          >
            View all
          </Link>
        </div>
        {loading ? (
          <p className="px-6 py-10 text-center text-navy-800/50">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-navy-800/60">No orders yet.</p>
            <Link href="/shop" className="btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-navy-800/5">
            {orders.slice(0, 5).map((o) => (
              <li
                key={o.orderRef}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div>
                  <p className="text-sm font-bold text-navy-800">{o.orderRef}</p>
                  <p className="text-xs text-navy-800/50">
                    {o.items.reduce((n, it) => n + it.quantity, 0)} item(s) ·{" "}
                    {new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-bold text-navy-800">
                    {formatPrice(o.total)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const toneBg: Record<string, string> = {
  blue: "bg-blue-50",
  amber: "bg-amber-50",
  green: "bg-emerald-50",
  red: "bg-red-50",
};
const toneText: Record<string, string> = {
  blue: "text-blue-500",
  amber: "text-amber-500",
  green: "text-emerald-500",
  red: "text-red-500",
};

function StatIcon({ name, className }: { name: string; className?: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "bag":
      return (
        <svg {...common}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <path d="M8 2h8" />
          <rect x="4" y="4" width="16" height="18" rx="2" />
          <circle cx="12" cy="13" r="4" />
          <path d="M12 11v2l1 1" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.7 1-1a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
      );
  }
}
