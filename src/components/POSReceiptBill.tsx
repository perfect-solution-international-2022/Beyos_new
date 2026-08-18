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

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  cod: "COD",
  reseller: "Reseller Account",
  onepay: "OnePay Card",
  pos_cash: "Cash",
  pos_card: "Card",
};

export default function POSReceiptBill({ receipt }: { receipt: ReceiptBillData }) {
  const date = new Date(receipt.createdAt);

  return (
    <div className="receipt-print pos-receipt-print mx-auto w-full max-w-[460px] rounded-[30px] border border-navy-900/10 bg-[#fdfdfc] px-8 py-9 text-[#101828] shadow-[0_24px_70px_rgba(16,24,40,0.13)] print:w-[80mm] print:max-w-[80mm] print:rounded-none print:border-0 print:p-[4mm] print:shadow-none">
      {/* Brand header */}
      <div className="text-center">
        <Image src="/images/logo.png" alt="Beyos Clothing" width={96} height={96} className="mx-auto h-[74px] w-[74px] object-contain" />
        <div className="mt-2">
          <p className="text-[22px] font-black tracking-[0.08em]">
            <span className="text-navy-900">BEYOS</span> <span className="text-brand">CLOTHING</span>
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.38em] text-navy-800/45">Style Is Forever</p>
        </div>
      </div>

      <div className="mt-5 border-y border-navy-900/10 py-3 text-center text-[11px] leading-5 text-navy-800/60">
        <p>Kendagaha Junction · Elpitiya 80458</p>
        <p>+94 74 319 1200</p>
      </div>

      {/* Title */}
      <div className="receipt-print-title mt-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-brand">Official Receipt</p>
      </div>

      {/* Bill meta */}
      <div className="receipt-print-meta mt-4 rounded-2xl border border-navy-800/10 bg-white px-5 py-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-navy-800/50">Order ID</span>
          <span className="font-bold text-navy-950">#{receipt.receiptNumber}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-navy-800/50">Date</span>
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
      <div className="mt-5 overflow-hidden rounded-xl border border-navy-800/10 print:hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-950 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <th className="px-4 py-3">Item</th>
              <th className="w-10 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {receipt.items.map((it, i) => (
              <tr key={i} className="border-t border-navy-800/10 align-top">
                <td className="px-4 py-3.5">
                  <span className="font-semibold text-navy-900">{it.name}</span>
                  {(it.size || it.color || it.sku) && (
                    <span className="mt-0.5 block text-[10px] text-navy-800/45">{[it.sku, it.size, it.color].filter(Boolean).join(" · ")}</span>
                  )}
                  <span className="mt-0.5 block text-[10px] text-navy-800/45">{billPrice(it.unitPrice)} each</span>
                </td>
                <td className="py-3.5 text-center text-navy-800/70">{it.quantity}</td>
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

        <div className="flex justify-between border-t border-dashed border-navy-800/15 pt-2.5">
          <span className="text-navy-800/60">Payment</span>
          <span className="font-semibold text-navy-900">{paymentLabels[receipt.paymentMethod] ?? receipt.paymentMethod}</span>
        </div>
      </div>

      <div className="receipt-print-thanks mt-8 border-t border-navy-900/10 pt-6 text-center">
        <p className="text-sm font-black tracking-[0.16em] text-navy-950">THANK YOU</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-navy-800/45">For choosing Beyos Clothing</p>
        <p className="mt-4 text-[10px] leading-4 text-navy-800/50">Please keep this receipt for exchanges.</p>
      </div>
    </div>
  );
}
