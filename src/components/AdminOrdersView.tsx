"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";
import { useToast } from "@/context/ToastProvider";
import { useAuth } from "@/context/AuthProvider";
import InvoiceView, { type InvoiceData } from "@/components/InvoiceView";

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
  enteredByName: string;
  enteredByType: string;
  createdAt: string;
}

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

type OrdersView = "all" | "pending" | "delivering" | "completed" | "rejected";

const viewTitle: Record<OrdersView, string> = {
  all: "All Orders",
  pending: "Pending Orders",
  delivering: "Pending Delivering",
  completed: "Completed Orders",
  rejected: "Rejected Orders",
};

export default function AdminOrdersView({ view = "all" }: { view?: OrdersView }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [saving, setSaving] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState("");
  const [syncingCourier, setSyncingCourier] = useState(false);
  const pendingOnly = view === "pending";

  const load = () => {
    const qs = view !== "all" ? `?view=${view}` : "";
    fetch(`/api/admin/orders${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, [view]);

  // Customer orders only pay via OnePay (no COD) — this checkout doesn't confirm payment on
  // its own, so anything sitting "unpaid" needs an admin to notice and follow up.
  const unpaidCustomerOrders = useMemo(
    () => orders.filter((o) => o.type === "customer" && o.paymentStatus !== "paid"),
    [orders]
  );

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (typeFilter === "all" || o.type === typeFilter) &&
          (!unpaidOnly || (o.type === "customer" && o.paymentStatus !== "paid")) &&
          (!search || `${o.orderRef} ${o.customerName} ${o.customerPhone || ""} ${o.enteredByName || ""}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [orders, search, typeFilter, unpaidOnly]
  );
  const summary = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    paid: orders.filter((order) => order.paymentStatus === "paid").length,
    total: orders.reduce((sum, order) => sum + order.amount, 0),
  }), [orders]);

  const markPaid = async (o: Order) => {
    setSaving(o.orderRef + ":pay");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: o.type, orderRef: o.orderRef, paymentStatus: "paid" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update payment");
      setOrders((prev) => prev.map((x) => (x.orderRef === o.orderRef ? { ...x, paymentStatus: "paid" } : x)));
      toast(`Marked ${o.orderRef} as paid`);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not update payment", "error");
    } finally {
      setSaving("");
    }
  };

  const deletePendingOrder = async () => {
    if (!deleteTarget) return;
    const order = deleteTarget;
    setSaving(order.orderRef + ":delete");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: order.type, orderRef: order.orderRef }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete order");
      setOrders((current) => current.filter((item) => item.orderRef !== order.orderRef));
      setDeleteTarget(null);
      toast(`Deleted ${order.orderRef}`);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not delete order", "error");
    } finally {
      setSaving("");
    }
  };

  const previewInvoice = async (orderRef: string) => {
    setLoadingInvoice(orderRef);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderRef)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load bill");
      setInvoice(data.order);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not load bill", "error");
    } finally {
      setLoadingInvoice("");
    }
  };

  const syncAllCourierUpdates = async () => {
    setSyncingCourier(true);
    try {
      const response = await fetch("/api/admin/orders/courier-sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sync courier updates");
      load();
      if (data.skipped) {
        toast("A courier sync is already running");
      } else if (data.failed) {
        toast(`Synced ${data.synced} orders; ${data.failed} could not be checked`, "error");
      } else {
        toast(`Courier sync complete: ${data.changed} update${data.changed === 1 ? "" : "s"} found`);
      }
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not sync courier updates", "error");
    } finally {
      setSyncingCourier(false);
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-navy-800">{viewTitle[view]}</h1>
        <p className="mt-1 text-sm text-navy-800/55">Review customer, reseller and POS orders from one place.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrderSummary label="Orders" value={String(summary.all)} />
        <OrderSummary label="Needs review" value={String(summary.pending)} emphasis={summary.pending > 0} />
        <OrderSummary label="Paid" value={String(summary.paid)} />
        <OrderSummary label="Order value" value={formatPrice(summary.total)} />
      </div>

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
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-xs" placeholder="Search order, customer, phone or user…" />
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
        <button
          type="button"
          onClick={syncAllCourierUpdates}
          disabled={syncingCourier}
          className="sm:ml-auto rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncingCourier ? "Syncing courier…" : "Sync all courier updates"}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Entered by</th>
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
              <tr><td colSpan={11} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-6 py-10 text-center text-navy-800/50">No orders found</td></tr>
            ) : (
              filtered.map((o) => (
                <tr
                  key={o.orderRef}
                  className={`border-b border-navy-800/5 last:border-0 ${
                    o.type === "customer" && o.paymentStatus !== "paid" ? "bg-amber-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4"><Link href={`/admin/orders/${encodeURIComponent(o.orderRef)}`} className="font-semibold text-brand hover:underline">#{o.orderRef}</Link></td>
                  <td className="px-6 py-4 capitalize text-navy-800/60">{o.type === "pos" ? "POS" : o.type}</td>
                  <td className="px-6 py-4 text-navy-800">
                    <p className="font-medium">{o.customerName}</p>
                    {o.customerPhone && <p className="mt-0.5 text-xs text-navy-800/45">{o.customerPhone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex min-w-[120px] items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold uppercase text-brand">{(o.enteredByName || "?").slice(0, 1)}</span>
                      <div><p className="font-semibold text-navy-800">{o.enteredByName || "Unknown user"}</p><p className="text-xs text-navy-800/45">{o.enteredByType}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-navy-800">{formatPrice(o.amount)}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4"><ResellerStatusBadge status={o.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-navy-800/50">{methodLabel[o.paymentMethod] ?? o.paymentMethod}</span>
                      <div className="flex items-center gap-2">
                        <span className={`badge capitalize ${paymentBadge[o.paymentStatus] ?? "bg-navy-50 text-navy-800"}`}>
                          {o.paymentMethod === "onepay" && o.paymentStatus === "paid" ? "Payment successful" : o.paymentStatus}
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
                          <span className={`badge w-fit capitalize ${deliveryBadge[o.deliveryStatus ?? "pending"] ?? "bg-navy-50 text-navy-800"}`}>
                            {o.deliveryStatus ?? "pending"}
                          </span>
                        )}
                      </div>
                    ) : (o.type === "reseller" && o.status === "pending") ||
                      (o.type === "customer" && o.status === "pending") ? (
                      <span className="text-xs text-navy-800/45">Review to accept/reject</span>
                    ) : (
                      <span className="text-xs text-navy-800/45">Updated automatically by courier</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderRef)}`}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${pendingOnly ? "bg-brand text-white hover:bg-brand/90" : "bg-navy-50 text-navy-800 hover:bg-navy-100"}`}
                      >
                        {pendingOnly ? "Review order" : "View details"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => previewInvoice(o.orderRef)}
                        disabled={loadingInvoice === o.orderRef}
                        className="rounded-lg border border-navy-800/15 px-3 py-1.5 text-xs font-semibold text-navy-800 transition hover:border-brand hover:text-brand"
                      >
                        {loadingInvoice === o.orderRef ? "Loading…" : "Print"}
                      </button>
                      {user?.adminRole === "super" && (
                        <button type="button" onClick={() => setDeleteTarget(o)} title="Move order to Trash" aria-label={`Move ${o.orderRef} to Trash`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 print:static print:bg-transparent print:p-0" onClick={() => setInvoice(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Bill ${invoice.orderRef}`} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:shadow-none" onClick={(event) => event.stopPropagation()}>
            <InvoiceView order={invoice} />
            <div className="flex justify-end gap-3 px-6 pb-8 print:hidden">
              <button type="button" onClick={() => setInvoice(null)} className="btn-outline">Close</button>
              <button type="button" onClick={() => window.print()} className="btn-primary">Print</button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/55 p-4" onClick={() => setDeleteTarget(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-order-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></div>
            <h2 id="delete-order-title" className="mt-4 text-lg font-bold text-navy-800">Archive this order?</h2>
            <p className="mt-2 text-sm leading-6 text-navy-800/60">Order <strong>#{deleteTarget.orderRef}</strong> will move to Trash. Reserved stock will be returned where applicable.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-navy-800/15 px-4 py-2 text-sm font-semibold text-navy-800">Cancel</button><button type="button" disabled={saving === deleteTarget.orderRef + ":delete"} onClick={deletePendingOrder} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{saving === deleteTarget.orderRef + ":delete" ? "Archiving..." : "Archive order"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSummary({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`border bg-white p-4 ${emphasis ? "border-amber-300 bg-amber-50" : "border-navy-800/10"}`}>
      <p className={`text-xs font-semibold uppercase ${emphasis ? "text-amber-700" : "text-navy-800/45"}`}>{label}</p>
      <p className="mt-1 text-xl font-bold text-navy-800">{value}</p>
    </div>
  );
}
