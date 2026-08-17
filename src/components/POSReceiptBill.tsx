"use client";

import Image from "next/image";

export interface ReceiptBillItem {
  name: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptBillData {
  receiptNumber: string;
  items: ReceiptBillItem[];
  customerName: string;
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
  createdAt: string;
}

function billPrice(amount: number) {
  return `Rs ${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function POSReceiptBill({ receipt }: { receipt: ReceiptBillData }) {
  const date = new Date(receipt.createdAt);

  return (
    <div className="receipt-print pos-receipt-print mx-auto w-full max-w-[520px] rounded-[28px] bg-[#f7f7f8] p-8 text-[#1a1a2e] shadow-[0_1px_3px_rgba(0,0,0,0.08)] print:w-[80mm] print:max-w-[80mm] print:rounded-none print:p-[4mm] print:shadow-none">
      {/* Brand header */}
      <div className="flex items-center gap-4">
        <Image src="/images/logo.png" alt="Beyos Clothing" width={80} height={80} className="h-16 w-16 shrink-0 object-contain" />
        <div>
          <p className="text-2xl font-extrabold tracking-tight">
            <span className="text-navy-900">BEYOS</span> <span className="text-brand">CLOTHING</span>
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.25em] text-navy-800/50">Style Is Forever</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-x-6 gap-y-2 border-t border-b border-dashed border-navy-800/15 py-3 text-xs text-navy-800/70">
        <span>Kendagaha junction, Elpitiya 80458</span>
        <span>+94 74 319 1200</span>
      </div>

      {/* Title */}
      <p className="receipt-print-title mt-6 text-center text-xl font-extrabold tracking-[0.15em] text-navy-900">RECEIPT BILL</p>

      {/* Bill meta */}
      <div className="receipt-print-meta mt-4 rounded-2xl border border-navy-800/10 bg-white px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-navy-800/60">Bill No</span>
          <span className="font-semibold text-navy-900">{receipt.receiptNumber}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-navy-800/60">Date</span>
          <span className="font-semibold text-navy-900">
            {date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-navy-800/60">Time</span>
          <span className="font-semibold text-navy-900">
            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
          </span>
        </div>
        {receipt.customerName && receipt.customerName !== "Walk-in Customer" && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-navy-800/60">Customer</span>
            <span className="font-semibold text-navy-900">{receipt.customerName}</span>
          </div>
        )}
        {receipt.fulfillmentType === "delivery" && (
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <span className="text-navy-800/60">Deliver to</span>
            <span className="text-right font-semibold text-navy-900">
              {receipt.deliveryAddress}
              {receipt.deliveryCity ? `, ${receipt.deliveryCity}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-navy-800/10 print:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="w-8 px-4 py-3">No.</th>
              <th className="px-2 py-3">Product</th>
              <th className="px-2 py-3">SKU</th>
              <th className="px-2 py-3 text-right">Price</th>
              <th className="px-2 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {receipt.items.map((it, i) => (
              <tr key={i} className="border-t border-navy-800/10 align-top">
                <td className="px-4 py-3 text-navy-800/70">{i + 1}</td>
                <td className="px-2 py-3">
                  <span className="font-semibold text-navy-900">{it.name}</span>
                  {(it.size || it.color) && (
                    <span className="block text-xs text-navy-800/50">{[it.size, it.color].filter(Boolean).join(" / ")}</span>
                  )}
                </td>
                <td className="px-2 py-3 text-navy-800/70">{it.sku || "—"}</td>
                <td className="px-2 py-3 text-right text-navy-800/70">{billPrice(it.unitPrice)}</td>
                <td className="px-2 py-3 text-right text-navy-800/70">{it.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold text-navy-900">{billPrice(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thermal printers cannot fit the six-column desktop table. Keep the
          receipt readable on 80 mm paper with just the essential columns. */}
      <table className="mt-4 hidden w-full border-collapse text-left text-[11px] print:table">
        <thead>
          <tr className="border-y border-black text-[10px] font-bold uppercase">
            <th className="py-1.5">Product</th>
            <th className="w-9 py-1.5 text-center">Qty</th>
            <th className="w-[18mm] py-1.5 text-right">Price</th>
            <th className="w-20 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((it, i) => (
            <tr key={i} className="border-b border-black/20 align-top">
              <td className="py-2 pr-2">
                <span className="font-semibold">{it.name}</span>
                {(it.size || it.color || it.sku) && (
                  <span className="block text-[9px] text-black/60">{[it.sku, it.size, it.color].filter(Boolean).join(" · ")}</span>
                )}
              </td>
              <td className="py-2 text-center">{it.quantity}</td>
              <td className="py-2 text-right">{billPrice(it.unitPrice)}</td>
              <td className="py-2 text-right font-semibold">{billPrice(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-navy-800/70">Subtotal</span>
          <span className="font-semibold text-navy-900">{billPrice(receipt.subtotal)}</span>
        </div>
        {receipt.discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-navy-800/70">Discount</span>
            <span className="font-semibold text-emerald-600">-{billPrice(receipt.discountAmount)}</span>
          </div>
        )}
        {receipt.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-navy-800/70">Tax</span>
            <span className="font-semibold text-navy-900">{billPrice(receipt.taxAmount)}</span>
          </div>
        )}
        {!!receipt.deliveryFee && (
          <div className="flex justify-between">
            <span className="text-navy-800/70">Delivery</span>
            <span className="font-semibold text-navy-900">{billPrice(receipt.deliveryFee)}</span>
          </div>
        )}

        <div className="receipt-print-total flex items-center justify-between rounded-xl bg-navy-900 px-5 py-3.5">
          <span className="text-base font-bold text-white">Grand Total</span>
          <span className="text-lg font-extrabold text-white">{billPrice(receipt.total)}</span>
        </div>

        {receipt.paymentMethod === "card" && (
          <div className="flex justify-between">
            <span className="text-navy-800/70">Payment Method</span>
            <span className="font-semibold text-navy-900">Card</span>
          </div>
        )}
      </div>

      <p className="receipt-print-thanks mt-7 text-center text-sm font-bold tracking-[0.1em] text-navy-900">THANK YOU FOR YOUR PURCHASE!</p>
    </div>
  );
}
