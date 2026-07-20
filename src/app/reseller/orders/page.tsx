"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";

interface Order {
  orderRef: string;
  customerName: string;
  amount: number;
  status: string;
  rejectReason: string | null;
  paymentStatus: string;
  quantity: number;
  createdAt: string;
}

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 10;

  useEffect(() => {
    fetch("/api/reseller/orders", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Order service did not return a response");
        setOrders(d.orders ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status.toLowerCase() !== status) return false;
      if (
        search &&
        !`${o.orderRef} ${o.customerName}`.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      const created = new Date(o.createdAt);
      if (startDate && created < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [orders, status, search, startDate, endDate]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = filtered.slice(page * perPage, page * perPage + perPage);
  useEffect(() => setPage(0), [search, status, startDate, endDate]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">All Orders List</h1>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-navy-800">Filters</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              placeholder="Search by Order ID, Customer…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Status
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Start Date
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              End Date
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Order Status</th>
                <th className="px-6 py-4">Reject Reason</th>
                <th className="px-6 py-4">Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              ) : current.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No orders found</td></tr>
              ) : (
                current.map((o) => (
                  <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-4 font-semibold text-brand">#{o.orderRef}</td>
                    <td className="px-6 py-4 text-navy-800/60">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                    <td className="px-6 py-4 text-navy-800">{o.customerName}</td>
                    <td className="px-6 py-4 font-bold text-navy-800">{formatPrice(o.amount)}</td>
                    <td className="px-6 py-4"><ResellerStatusBadge status={o.status} /></td>
                    <td className="px-6 py-4 text-navy-800/50">{o.rejectReason || "—"}</td>
                    <td className="px-6 py-4 capitalize text-navy-800/60">{o.paymentStatus}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-4 border-t border-navy-800/10 px-6 py-3 text-sm text-navy-800/60">
          <span>
            {filtered.length === 0 ? "0-0 of 0" : `${page * perPage + 1}-${Math.min((page + 1) * perPage, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-navy-50 disabled:opacity-30"
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-navy-50 disabled:opacity-30"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
