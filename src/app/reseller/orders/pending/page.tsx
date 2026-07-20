"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";

interface Order {
  orderRef: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetch("/api/reseller/orders?status=pending", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (search && !`${o.orderRef} ${o.customerName}`.toLowerCase().includes(search.toLowerCase())) return false;
      const created = new Date(o.createdAt);
      if (startDate && created < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [orders, search, startDate, endDate]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Pending Orders List</h1>

      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-navy-800">Filters</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Search Pending Orders
            </label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="Search by Order ID, Customer…" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No pending orders</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4 font-semibold text-brand">#{o.orderRef}</td>
                  <td className="px-6 py-4 text-navy-800">{o.customerName}</td>
                  <td className="px-6 py-4 font-semibold text-navy-800">{formatPrice(o.amount)}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4"><ResellerStatusBadge status={o.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
