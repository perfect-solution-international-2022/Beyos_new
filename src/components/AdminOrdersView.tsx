"use client";

import Link from "next/link";
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
  deliveryStatus?: string | null;
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

const deliveryBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
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
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [saving, setSaving] = useState("");

  const load = () => {
    const qs = pendingOnly ? "?view=pending" : "";
    fetch(`/api/admin/orders${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, [pendingOnly]);

  // Customer orders only pay via OnePay (no COD) — this checkout doesn't confirm payment on
  // its own, so anything sitting "unpaid" needs an admin to notice and follow up.
  const unpaidCustomerOrders = useMemo(
    () => orders.filter((o) => o.type === "customer" && o.paymentStatus !== "paid"),
    [orders]
  );

  const isPendingApproval = (o: Order) =>
    o.type === "pos" ? o.deliveryStatus === "pending" : o.status.toLowerCase() === "pending";

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (!pendingOnly || isPendingApproval(o)) &&
          (typeFilter === "all" || o.type === typeFilter) &&
          (!unpaidOnly || (o.type === "customer" && o.paymentStatus !== "paid")) &&
          (!search || `${o.orderRef} ${o.customerName}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [orders, search, typeFilter, unpaidOnly, pendingOnly]
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

  const acceptReseller = (o: Order) => updateStatus(o, "confirmed");
  const rejectReseller = (o: Order) => updateStatus(o, "rejected");

  const setPosDeliveryStatus = async (o: Order, deliveryStatus: string) => {
    setSaving(o.orderRef);
    setOrders((prev) => prev.map((x) => (x.orderRef === o.orderRef ? { ...x, deliveryStatus } : x)));
    try {
      await fetch(`/api/pos/sales/${encodeURIComponent(o.orderRef)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus }),
      });
      toast(deliveryStatus === "cancelled" ? `Rejected ${o.orderRef}` : `Accepted ${o.orderRef}`);
    } finally {
      setSaving("");
    }
  };
  const acceptPos = (o: Order) => setPosDeliveryStatus(o, "accepted");
  const rejectPos = (o: Order) => setPosDeliveryStatus(o, "cancelled");

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

      {!loading && unpaidCustomerOrders.length > 0 && (
        <button
          onClick={() => setUnpaidOnly(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-left transition hover:border-amber-400"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className="flex-1 text-sm">
            <span className="font-semibold text-amber-800">
              {unpaidCustomerOrders.length} customer order{unpaidCustomerOrders.length === 1 ? "" : "s"} awaiting payment confirmation
            </span>
            <span className="ml-2 text-amber-700/80">
              OnePay checkout doesn&apos;t confirm automatically — review and mark paid once verified.
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-amber-700">View →</span>
        </button>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-xs" placeholder="Search Order ID or Customer…" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input sm:max-w-[180px]">
          <option value="all">All Types</option>
          <option value="customer">Customer</option>
          <option value="reseller">Reseller</option>
          <option value="pos">POS</option>
        </select>
        <button
          onClick={() => setUnpaidOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            unpaidOnly ? "border-amber-400 bg-amber-50 text-amber-700" : "border-navy-800/15 text-navy-800/60 hover:border-brand hover:text-brand"
          }`}
        >
          Unpaid only
          {unpaidOnly && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" onClick={(e) => { e.stopPropagation(); setUnpaidOnly(false); }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
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
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-6 py-10 text-center text-navy-800/50">No orders found</td></tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.orderRef}
                  className={`border-b border-navy-800/5 last:border-0 ${
                    o.type === "customer" && o.paymentStatus !== "paid" ? "bg-amber-50/50" : ""
                  }`}
                >
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
                    {(o.type === "customer" || o.type === "reseller") && o.koombiyoWaybillId ? (
                      <div className="flex min-w-[130px] flex-col gap-1">
                        <span className="font-mono text-xs font-semibold text-navy-800">{o.koombiyoWaybillId}</span>
                        <span className="text-xs text-navy-800/55">{o.koombiyoStatus || "Awaiting update"}</span>
                      </div>
                    ) : (
                      <span className="text-navy-800/30">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {o.type === "pos" ? (
                      <div className="flex flex-col gap-1.5 text-xs text-navy-800/45">
                        <span>{o.fulfillmentType === "delivery" ? "POS delivery" : "Store pickup"}</span>
                        {o.fulfillmentType === "delivery" && (
                          <>
                            <span className={`badge w-fit capitalize ${deliveryBadge[o.deliveryStatus ?? "pending"] ?? "bg-navy-50 text-navy-800"}`}>
                              {o.deliveryStatus ?? "pending"}
                            </span>
                            {o.deliveryStatus === "pending" && (
                              <div className="flex gap-1.5">
                                <button
                                  disabled={saving === o.orderRef}
                                  onClick={() => acceptPos(o)}
                                  className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                                >
                                  Accept
                                </button>
                                <button
                                  disabled={saving === o.orderRef}
                                  onClick={() => rejectPos(o)}
                                  className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : o.type === "reseller" && o.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <button
                          disabled={saving === o.orderRef}
                          onClick={() => acceptReseller(o)}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          Accept
                        </button>
                        <button
                          disabled={saving === o.orderRef}
                          onClick={() => rejectReseller(o)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
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
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                      className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                    >
                      View
                    </Link>
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
