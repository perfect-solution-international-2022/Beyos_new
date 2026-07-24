"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";

interface Stats {
  totalSales: number;
  myOrders: number;
  pendingOrders: number;
  walletBalance: number;
}
interface RecentOrder {
  orderRef: string;
  amount: number;
  status: string;
  quantity: number;
  createdAt: string;
}

export default function ResellerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reseller/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setRecent(d.recent ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Sales", value: stats ? formatPrice(stats.totalSales) : "—", icon: "dollar", tone: "green" },
    { label: "My Orders", value: stats?.myOrders ?? "—", icon: "cart", tone: "blue" },
    { label: "Pending Orders", value: stats?.pendingOrders ?? "—", icon: "cart", tone: "amber" },
    { label: "Wallet Balance", value: stats ? formatPrice(stats.walletBalance) : "—", icon: "wallet", tone: "purple" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Dashboard Overview</h1>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-navy-800/50">{c.label}</p>
                <p className="mt-3 text-2xl font-extrabold text-navy-800">
                  {loading ? "…" : c.value}
                </p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneBg[c.tone]}`}>
                <CardIcon name={c.icon} className={toneText[c.tone]} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy-800">Recent Orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                <th className="pb-3 pr-4">Order ID</th>
                <th className="pb-3 pr-4">Order Date</th>
                <th className="pb-3 pr-4">Quantity</th>
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-navy-800/50">
                    Loading…
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-navy-800/50">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recent.map((o) => (
                  <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                    <td className="py-4 pr-4 font-semibold text-navy-800">{o.orderRef}</td>
                    <td className="py-4 pr-4 text-navy-800/60">
                      {new Date(o.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-4 pr-4 text-navy-800/70">{o.quantity}</td>
                    <td className="py-4 pr-4 font-bold text-navy-800">{formatPrice(o.amount)}</td>
                    <td className="py-4">
                      <ResellerStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const toneBg: Record<string, string> = {
  green: "bg-emerald-50",
  blue: "bg-blue-50",
  amber: "bg-amber-50",
  purple: "bg-purple-50",
};
const toneText: Record<string, string> = {
  green: "text-emerald-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
  purple: "text-purple-500",
};

function CardIcon({ name, className }: { name: string; className?: string }) {
  const c = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  if (name === "dollar")
    return (
      <svg {...c}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  if (name === "wallet")
    return (
      <svg {...c}>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    );
  return (
    <svg {...c}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}
