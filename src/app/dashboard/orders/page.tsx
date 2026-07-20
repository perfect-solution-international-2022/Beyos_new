"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";

interface OrderItem {
  name: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
}
interface Order {
  orderRef: string;
  status: string;
  createdAt: string;
  subtotal: number;
  shipping: number;
  total: number;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load orders");
        setOrders(d.orders ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (status !== "all" && o.status.toLowerCase() !== status) return false;
      const created = new Date(o.createdAt);
      if (startDate && created < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (created > end) return false;
      }
      return true;
    });
  }, [orders, status, startDate, endDate]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">All Orders</h1>

      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-navy-800">Filters</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        {(status !== "all" || startDate || endDate) && (
          <button
            onClick={() => {
              setStatus("all");
              setStartDate("");
              setEndDate("");
            }}
            className="mt-4 text-sm font-medium text-brand hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Orders */}
      <div className="mt-6">
        {loading ? (
          <p className="py-16 text-center text-navy-800/50">Loading orders…</p>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-navy-800/5 bg-white py-16 text-center shadow-sm">
            <p className="text-navy-800/60">No orders match your filters.</p>
            <Link href="/shop" className="btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((o) => {
              const open = expanded === o.orderRef;
              const itemCount = o.items.reduce((n, it) => n + it.quantity, 0);
              return (
                <div
                  key={o.orderRef}
                  className="overflow-hidden rounded-2xl border border-navy-800/5 bg-white shadow-sm"
                >
                  <button
                    onClick={() => setExpanded(open ? null : o.orderRef)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 text-left hover:bg-navy-50/50"
                  >
                    <div>
                      <p className="text-sm font-bold text-navy-800">
                        {o.orderRef}
                      </p>
                      <p className="text-xs text-navy-800/50">
                        {itemCount} item(s) ·{" "}
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
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-navy-800/40 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-navy-800/10 px-6 py-4">
                      <ul className="divide-y divide-navy-800/5">
                        {o.items.map((it, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between py-2.5 text-sm"
                          >
                            <span className="text-navy-800">
                              {it.name}{" "}
                              <span className="text-navy-800/40">
                                · {it.size} · {it.color} × {it.quantity}
                              </span>
                            </span>
                            <span className="font-medium text-navy-800">
                              {formatPrice(it.lineTotal)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <dl className="mt-3 space-y-1 border-t border-navy-800/10 pt-3 text-sm">
                        <div className="flex justify-between text-navy-800/60">
                          <dt>Subtotal</dt>
                          <dd>{formatPrice(o.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between text-navy-800/60">
                          <dt>Shipping</dt>
                          <dd>{o.shipping === 0 ? "Free" : formatPrice(o.shipping)}</dd>
                        </div>
                        <div className="flex justify-between font-bold text-navy-800">
                          <dt>Total</dt>
                          <dd>{formatPrice(o.total)}</dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
