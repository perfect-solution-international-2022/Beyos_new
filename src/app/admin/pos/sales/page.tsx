"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};
const DELIVERY_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  out_for_delivery: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
};

interface SaleRow {
  receiptNumber: string;
  cashierName: string;
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
  cashierName: string;
  customerName: string;
  items: { name: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  amountTendered: number | null;
  changeDue: number | null;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryStatus?: string | null;
  createdAt: string;
}

export default function AdminPosSalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

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
              <th className="px-6 py-4">Cashier</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Fulfillment</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No sales found</td></tr>
            ) : (
              sales.map((s) => (
                <tr
                  key={s.receiptNumber}
                  className="cursor-pointer border-b border-navy-800/5 last:border-0 hover:bg-navy-50/50"
                  onClick={() => openReceipt(s.receiptNumber)}
                >
                  <td className="px-6 py-3 font-mono text-navy-800/80">{s.receiptNumber}</td>
                  <td className="px-6 py-3 text-navy-800">{s.cashierName}</td>
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
          onClose={() => setReceipt(null)}
          onStatusChange={(status) => updateDeliveryStatus(receipt.receiptNumber, status)}
        />
      )}
    </div>
  );
}

function ReceiptModal({ receipt, onClose, onStatusChange }: { receipt: Receipt; onClose: () => void; onStatusChange: (status: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <p className="text-lg font-black tracking-wide text-navy-800">BEYOS</p>
          <p className="text-xs text-navy-800/50">Receipt #{receipt.receiptNumber}</p>
          <p className="text-xs text-navy-800/50">{new Date(receipt.createdAt).toLocaleString("en-GB")}</p>
          <p className="mt-1 text-xs text-navy-800/50">Cashier: {receipt.cashierName}</p>
          <p className="text-xs text-navy-800/50">{receipt.customerName}</p>
          {receipt.fulfillmentType === "delivery" && (
            <p className="mt-1 text-xs font-semibold text-blue-600">FOR DELIVERY</p>
          )}
        </div>

        {receipt.fulfillmentType === "delivery" && (
          <div className="mt-3 rounded-lg bg-navy-50 p-3 text-xs text-navy-800/80">
            <p className="font-semibold text-navy-800">Deliver to:</p>
            <p>{receipt.deliveryAddress}</p>
            {receipt.deliveryCity && <p>{receipt.deliveryCity}</p>}
            <div className="mt-3 print:hidden">
              <p className="mb-1.5 font-semibold text-navy-800">Delivery status</p>
              <div className="flex gap-1.5">
                {(["pending", "out_for_delivery", "delivered"] as const).map((s) => (
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
          </div>
        )}

        <div className="mt-4 space-y-2 border-y border-dashed border-navy-800/20 py-3">
          {receipt.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <p className="text-navy-800">{it.name}{it.size ? ` (${it.size})` : ""}{it.color ? ` / ${it.color}` : ""}</p>
                <p className="text-xs text-navy-800/50">{it.quantity} × {formatPrice(it.unitPrice)}</p>
              </div>
              <p className="font-semibold text-navy-800">{formatPrice(it.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-navy-800/70"><span>Subtotal</span><span>{formatPrice(receipt.subtotal)}</span></div>
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-navy-800/70"><span>Discount</span><span>-{formatPrice(receipt.discountAmount)}</span></div>
          )}
          {receipt.taxAmount > 0 && (
            <div className="flex justify-between text-navy-800/70"><span>Tax</span><span>{formatPrice(receipt.taxAmount)}</span></div>
          )}
          <div className="flex justify-between border-t border-navy-800/10 pt-1.5 text-base font-bold text-navy-800"><span>Total</span><span>{formatPrice(receipt.total)}</span></div>
          {receipt.paymentMethod === "cash" && receipt.amountTendered !== null && (
            <>
              <div className="flex justify-between text-navy-800/70"><span>Tendered</span><span>{formatPrice(receipt.amountTendered)}</span></div>
              <div className="flex justify-between text-navy-800/70"><span>Change</span><span>{formatPrice(receipt.changeDue ?? 0)}</span></div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <button onClick={onClose} className="btn-outline">Close</button>
          <button onClick={() => window.print()} className="btn-primary">Print</button>
        </div>
      </div>
    </div>
  );
}
