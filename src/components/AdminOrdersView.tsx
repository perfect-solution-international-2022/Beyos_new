"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";
import { useToast } from "@/context/ToastProvider";

interface Order {
  type: "customer" | "reseller" | "pos";
  orderRef: string;
  customerName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef: string | null;
  customerPhone: string;
  koombiyoWaybillId: string | null;
  koombiyoStatus: string | null;
  koombiyoUpdatedAt: string | null;
  fulfillmentType?: string;
  cashierName?: string;
  createdAt: string;
}

const CUSTOMER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const RESELLER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled", "rejected"];

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
};

const methodLabel: Record<string, string> = {
  cod: "Cash on Delivery",
  onepay: "Card (OnePay)",
  reseller: "Reseller",
  pos_cash: "POS Cash",
  pos_card: "POS Card",
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

  const runKoombiyoAction = async (o: Order) => {
    const action = o.koombiyoWaybillId ? "track" : "dispatch";
    setSaving(`${o.orderRef}:koombiyo`);
    try {
      const response = await fetch("/api/admin/orders/koombiyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef: o.orderRef, action, type: o.type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Koombiyo request failed");
      setOrders((previous) =>
        previous.map((item) =>
          item.orderRef === o.orderRef
            ? {
                ...item,
                status: data.status || item.status,
                paymentStatus: data.status === "delivered" ? "paid" : item.paymentStatus,
                koombiyoWaybillId: data.waybillId,
                koombiyoStatus: data.courierStatus,
                koombiyoUpdatedAt: data.updatedAt || new Date().toISOString(),
              }
            : item
        )
      );
      toast(action === "dispatch" ? `${o.orderRef} sent to Koombiyo` : `Tracking updated for ${o.orderRef}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Koombiyo request failed", "error");
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
          <option value="pos">POS</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Courier</th>
              <th className="px-6 py-4">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-10 text-center text-navy-800/50">No orders found</td></tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4 font-semibold text-brand">#{o.orderRef}</td>
                  <td className="px-6 py-4 capitalize text-navy-800/60">{o.type === "pos" ? "POS" : o.type}</td>
                  <td className="px-6 py-4 text-navy-800">
                    {o.customerName}
                  </td>
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
                    {o.type === "customer" || o.type === "reseller" ? (
                      <div className="flex min-w-[130px] flex-col gap-1.5">
                        {o.koombiyoWaybillId && (
                          <>
                            <span className="font-mono text-xs font-semibold text-navy-800">{o.koombiyoWaybillId}</span>
                            <span className="text-xs text-navy-800/55">{o.koombiyoStatus || "Awaiting update"}</span>
                          </>
                        )}
                        <button
                          disabled={saving === `${o.orderRef}:koombiyo` || o.status === "cancelled"}
                          onClick={() => runKoombiyoAction(o)}
                          className="w-fit text-xs font-semibold text-brand hover:underline disabled:opacity-40"
                        >
                          {saving === `${o.orderRef}:koombiyo`
                            ? "Working…"
                            : o.koombiyoWaybillId
                              ? "Sync tracking"
                              : "Send to Koombiyo"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-navy-800/30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {o.type === "pos" ? (
                      <span className="text-xs text-navy-800/45">
                        {o.fulfillmentType === "delivery" ? "POS delivery" : "Store pickup"}
                      </span>
                    ) : (
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
                    )}
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
