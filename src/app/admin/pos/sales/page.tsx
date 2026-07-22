"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import POSReceiptBill from "@/components/POSReceiptBill";

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const DELIVERY_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

interface SaleRow {
  receiptNumber: string;
  customerName: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  status: string;
  fulfillmentType?: string;
  deliveryStatus?: string | null;
  createdAt: string;
}

interface Receipt {
  receiptNumber: string;
  customerName: string;
  items: { name: string; sku?: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  amountTendered: number | null;
  changeDue: number | null;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryStatus?: string | null;
  koombiyoWaybillId?: string | null;
  koombiyoStatus?: string | null;
  createdAt: string;
}

export default function AdminPosSalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [koombiyoBusy, setKoombiyoBusy] = useState<"waybill" | "place" | null>(null);
  const [koombiyoError, setKoombiyoError] = useState("");
  const [specialNote, setSpecialNote] = useState("");

  const load = (q?: string) => {
    setLoading(true);
    const url = q ? `/api/pos/sales?search=${encodeURIComponent(q)}` : "/api/pos/sales";
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSales(d.sales ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const openReceipt = async (receiptNumber: string) => {
    const res = await fetch(`/api/pos/sales/${receiptNumber}`, { cache: "no-store" });
    const d = await res.json();
    if (d.receipt) setReceipt(d.receipt);
  };

  const updateDeliveryStatus = async (receiptNumber: string, deliveryStatus: string) => {
    const res = await fetch(`/api/pos/sales/${receiptNumber}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus }),
    });
    if (!res.ok) return;
    setSales((prev) => prev.map((s) => (s.receiptNumber === receiptNumber ? { ...s, deliveryStatus } : s)));
    setReceipt((prev) => (prev && prev.receiptNumber === receiptNumber ? { ...prev, deliveryStatus } : prev));
  };

  const requestWaybill = async () => {
    if (!receipt) return;
    setKoombiyoBusy("waybill");
    setKoombiyoError("");
    try {
      const res = await fetch("/api/admin/pos/sales/koombiyo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNumber: receipt.receiptNumber, action: "request-waybill" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not request a waybill ID");
      setReceipt((prev) => (prev ? { ...prev, koombiyoWaybillId: d.waybillId } : prev));
    } catch (error) {
      setKoombiyoError(error instanceof Error ? error.message : "Could not request a waybill ID");
    } finally {
      setKoombiyoBusy(null);
    }
  };

  const placeOrder = async () => {
    if (!receipt) return;
    setKoombiyoBusy("place");
    setKoombiyoError("");
    try {
      const res = await fetch("/api/admin/pos/sales/koombiyo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptNumber: receipt.receiptNumber, action: "place-order", specialNote }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not place the order with Koombiyo");
      setReceipt((prev) => (prev ? { ...prev, koombiyoStatus: d.courierStatus, deliveryStatus: d.deliveryStatus } : prev));
      setSales((prev) => prev.map((s) => (s.receiptNumber === receipt.receiptNumber ? { ...s, deliveryStatus: d.deliveryStatus } : s)));
    } catch (error) {
      setKoombiyoError(error instanceof Error ? error.message : "Could not place the order with Koombiyo");
    } finally {
      setKoombiyoBusy(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Sales History</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); load(search); }} className="mt-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search receipt # or customer name"
          className="input max-w-xs"
        />
        <button type="submit" className="btn-outline">Search</button>
        {search && (
          <button type="button" className="btn-outline" onClick={() => { setSearch(""); load(); }}>Clear</button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Receipt</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Fulfillment</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No sales found</td></tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s.receiptNumber}
                  className="cursor-pointer border-b border-navy-800/5 last:border-0 hover:bg-navy-50/50"
                  onClick={() => openReceipt(s.receiptNumber)}
                >
                  <td className="px-6 py-3 font-mono text-navy-800/80">{s.receiptNumber}</td>
                  <td className="px-6 py-3 text-navy-800/70">{s.customerName || "Walk-in"}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${s.paymentMethod === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {s.fulfillmentType === "delivery" ? (
                      <span className={`badge ${DELIVERY_STATUS_STYLES[s.deliveryStatus ?? "pending"]}`}>
                        {DELIVERY_STATUS_LABELS[s.deliveryStatus ?? "pending"]}
                      </span>
                    ) : (
                      <span className="text-navy-800/40">Pickup</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-navy-800/60">{new Date(s.createdAt).toLocaleString("en-GB")}</td>
                  <td className="px-6 py-3 text-right font-bold text-navy-800">{formatPrice(s.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => { setReceipt(null); setKoombiyoError(""); setSpecialNote(""); }}
          onStatusChange={(status) => updateDeliveryStatus(receipt.receiptNumber, status)}
          koombiyoBusy={koombiyoBusy}
          koombiyoError={koombiyoError}
          specialNote={specialNote}
          onSpecialNoteChange={setSpecialNote}
          onRequestWaybill={requestWaybill}
          onPlaceOrder={placeOrder}
        />
      )}
    </div>
  );
}

function ReceiptModal({
  receipt,
  onClose,
  onStatusChange,
  koombiyoBusy,
  koombiyoError,
  specialNote,
  onSpecialNoteChange,
  onRequestWaybill,
  onPlaceOrder,
}: {
  receipt: Receipt;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  koombiyoBusy: "waybill" | "place" | null;
  koombiyoError: string;
  specialNote: string;
  onSpecialNoteChange: (value: string) => void;
  onRequestWaybill: () => void;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 print:static print:bg-transparent print:p-0" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <POSReceiptBill receipt={receipt} />

        {receipt.fulfillmentType === "delivery" && (
          <div className="mx-6 mb-4 space-y-3 rounded-lg bg-navy-50 p-3 print:hidden">
            {koombiyoError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{koombiyoError}</p>
            )}

            {(receipt.deliveryStatus ?? "pending") === "pending" ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-navy-800">
                  This delivery order needs approval before it can be dispatched.
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onStatusChange("accepted")}
                    className="flex-1 rounded-lg bg-emerald-100 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onStatusChange("cancelled")}
                    className="flex-1 rounded-lg bg-red-100 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : receipt.deliveryStatus === "cancelled" ? (
              <p className="text-xs font-semibold text-red-600">This delivery order was rejected.</p>
            ) : (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-navy-800">Waybill ID</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={receipt.koombiyoWaybillId ?? ""}
                      placeholder="Click &quot;Request Waybill ID&quot; to get a waybill"
                      className="input flex-1 bg-white text-xs disabled:text-navy-800/40"
                    />
                    <button
                      onClick={onRequestWaybill}
                      disabled={koombiyoBusy !== null}
                      className="shrink-0 rounded-lg bg-navy-800 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-900 disabled:opacity-50"
                    >
                      {koombiyoBusy === "waybill" ? "Requesting…" : "Request Waybill ID"}
                    </button>
                  </div>
                </div>

                {receipt.koombiyoWaybillId && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-navy-800">Special notes</p>
                    <textarea
                      value={specialNote}
                      onChange={(e) => onSpecialNoteChange(e.target.value)}
                      rows={2}
                      className="input w-full resize-none bg-white text-xs"
                    />
                    <button
                      onClick={onPlaceOrder}
                      disabled={koombiyoBusy !== null}
                      className="btn-primary mt-2 w-full disabled:opacity-50"
                    >
                      {koombiyoBusy === "place" ? "Processing…" : "Place Order"}
                    </button>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-navy-800">Delivery status</p>
                  <div className="flex gap-1.5">
                    {(["accepted", "out_for_delivery", "delivered"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => onStatusChange(s)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                          (receipt.deliveryStatus ?? "pending") === s
                            ? DELIVERY_STATUS_STYLES[s]
                            : "bg-white text-navy-800/50 hover:bg-navy-100"
                        }`}
                      >
                        {DELIVERY_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 pb-8 print:hidden">
          <button onClick={onClose} className="btn-outline">Close</button>
          <button onClick={() => window.print()} className="btn-primary">Print</button>
        </div>
      </div>
    </div>
  );
}
