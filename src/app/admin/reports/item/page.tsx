"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Item { name: string; quantity: number; revenue: number; }

export default function ItemReportPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports/item", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const maxQty = Math.max(1, ...items.map((i) => i.quantity));

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Item Report</h1>
      <p className="mt-1 text-sm text-navy-800/50">Units sold and revenue per product.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Units Sold</th>
              <th className="px-6 py-4">Revenue</th>
              <th className="px-6 py-4 w-1/3">Share</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No sales yet.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.name} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3 font-medium text-navy-800">{it.name}</td>
                  <td className="px-6 py-3 font-bold text-navy-800">{it.quantity}</td>
                  <td className="px-6 py-3 text-navy-800/70">{formatPrice(it.revenue)}</td>
                  <td className="px-6 py-3">
                    <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(it.quantity / maxQty) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
