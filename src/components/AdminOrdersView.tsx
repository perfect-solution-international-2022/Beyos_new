"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";
import { useToast } from "@/context/ToastProvider";

interface Order {
  type: "customer" | "reseller";
  orderRef: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef: string | null;
  createdAt: string;
}

const CUSTOMER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const RESELLER_STATUSES = ["pending", "completed", "rejected"];

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
};

const methodLabel: Record<string, string> = {
  cod: "Cash on Delivery",
  onepay: "Card (OnePay)",
  reseller: "Reseller",
};

export default function AdminOrdersView({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [saving, setSaving] = useState("");

  const load = () => {
    fetch("/api/admin/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (!pendingOnly || o.status.toLowerCase() === "pending") &&
          (typeFilter === "all" || o.type === typeFilter) &&
          (!search || `${o.orderRef} ${o.customerName}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [orders, search, typeFilter, pendingOnly]
  );

  const updateStatus = async (o: Order, status: string) => {
    setSaving(o.orderRef);
    setOrders((prev) => prev.map((x) => (x.orderRef === o.orderRef ? { ...x, status } : x)));
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: o.type, orderRef: o.orderRef, status }),
      });
    } finally {
      setSaving("");
    }
  };

  const markPaid = async (o: Order) => {
    setSaving(o.orderRef + ":pay");
    setOrders((prev) => prev.map((x) => (x.orderRef === o.orderRef ? { ...x, paymentStatus: "paid" } : x)));
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: o.type, orderRef: o.orderRef, paymentStatus: "paid" }),
      });
      toast(`Marked ${o.orderRef} as paid`);
    } finally {
      setSaving("");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">{pendingOnly ? "Pending Orders" : "All Orders"}</h1>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-xs" placeholder="Search Order ID or Customer…" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input sm:max-w-[180px]">
          <option value="all">All Types</option>
          <option value="customer">Customer</option>
          <option value="reseller">Reseller</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-10 text-center text-navy-800/50">No orders found</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4 font-semibold text-brand">#{o.orderRef}</td>
                  <td className="px-6 py-4 capitalize text-navy-800/60">{o.type}</td>
                  <td className="px-6 py-4 text-navy-800">{o.customerName}</td>
                  <td className="px-6 py-4 font-bold text-navy-800">{formatPrice(o.amount)}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4"><ResellerStatusBadge status={o.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-navy-800/50">{methodLabel[o.paymentMethod] ?? o.paymentMethod}</span>
                      <div className="flex items-center gap-2">
                        <span className={`badge capitalize ${paymentBadge[o.paymentStatus] ?? "bg-navy-50 text-navy-800"}`}>
                          {o.paymentStatus}
                        </span>
                        {o.paymentStatus !== "paid" && o.type === "customer" && (
                          <button
                            disabled={saving === o.orderRef + ":pay"}
                            onClick={() => markPaid(o)}
                            className="text-xs font-semibold text-brand hover:underline disabled:opacity-40"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={o.status}
                      disabled={saving === o.orderRef}
                      onChange={(e) => updateStatus(o, e.target.value)}
                      className="rounded-lg border border-navy-800/15 bg-white px-2 py-1.5 text-xs font-medium capitalize text-navy-800 outline-none focus:border-brand"
                    >
                      {(o.type === "reseller" ? RESELLER_STATUSES : CUSTOMER_STATUSES).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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
