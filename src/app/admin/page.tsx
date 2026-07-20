"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Stats {
  dailyRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  monthlyRevenue: number;
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [week, setWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setWeek(d.weeklyOrders ?? [0, 0, 0, 0, 0, 0, 0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Daily Revenue", value: stats ? formatPrice(stats.dailyRevenue) : "—", icon: "dollar" },
    { label: "Total Orders", value: stats?.totalOrders ?? "—", icon: "cart" },
    { label: "Total Customers", value: stats?.totalCustomers ?? "—", icon: "users" },
    { label: "Monthly Revenue", value: stats ? formatPrice(stats.monthlyRevenue) : "—", icon: "trend" },
  ];

  const maxVal = Math.max(1, ...week);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Dashboard Overview</h1>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border-2 border-brand/40 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-navy-800/50">{c.label}</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
                <CardIcon name={c.icon} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-navy-800">
              {loading ? "—" : c.value}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-navy-50">
              <div className="h-full w-3/4 bg-gradient-to-r from-brand to-amber-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Weekly orders chart */}
      <div className="mt-8 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Daily Orders This Week</h2>
        <p className="text-sm text-navy-800/50">Order volume by day of the week</p>
        <div className="mt-6 flex h-64 items-end gap-3 sm:gap-6">
          {week.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-brand transition-all"
                  style={{ height: `${(v / maxVal) * 100}%`, minHeight: v > 0 ? "4px" : "0" }}
                  title={`${v} orders`}
                />
              </div>
              <span className="text-xs font-medium text-navy-800/50">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardIcon({ name }: { name: string }) {
  const c = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  if (name === "dollar")
    return <svg {...c}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (name === "users")
    return <svg {...c}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /></svg>;
  if (name === "trend")
    return <svg {...c}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
  return <svg {...c}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
}
