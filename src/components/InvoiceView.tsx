"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/utils";

export interface InvoiceItem {
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceData {
  orderRef: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal?: number;
  shipping?: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  createdAt: string;
  items: InvoiceItem[];
}

const methodLabel: Record<string, string> = {
  cod: "Cash on Delivery",
  onepay: "Card (OnePay)",
  reseller: "Reseller",
};

export default function InvoiceView({ order }: { order: InvoiceData }) {
  const date = new Date(order.createdAt);
  const address = [order.address, order.city, order.district, order.province, order.postalCode].filter(Boolean).join(", ");

  return (
    <div className="receipt-print mx-auto w-full max-w-[720px] bg-white p-10 text-[#1a1a2e] print:max-w-none">
      <div className="flex items-start justify-between gap-6 border-b border-navy-800/10 pb-6">
        <div className="flex items-center gap-4">
          <Image src="/images/logo.png" alt="Beyos Clothing" width={72} height={72} className="h-14 w-14 object-contain" />
          <div>
            <p className="text-xl font-extrabold tracking-tight">
              <span className="text-navy-900">BEYOS</span> <span className="text-brand">CLOTHING</span>
            </p>
            <p className="text-xs text-navy-800/50">Kendagaha junction, Elpitiya 80458</p>
            <p className="text-xs text-navy-800/50">+94 77 170 3844</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold uppercase tracking-wide text-navy-900">Invoice</p>
          <p className="mt-1 text-sm text-navy-800/60">#{order.orderRef}</p>
          <p className="mt-0.5 text-xs text-navy-800/50">
            {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">Billed To</p>
          <p className="mt-1.5 font-semibold text-navy-900">{order.customerName}</p>
          {order.customerPhone && <p className="text-sm text-navy-800/70">{order.customerPhone}</p>}
          {order.customerEmail && <p className="text-sm text-navy-800/70">{order.customerEmail}</p>}
          {address && <p className="mt-1 text-sm text-navy-800/70">{address}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">Payment</p>
          <p className="mt-1.5 text-sm text-navy-800/70">
            {methodLabel[order.paymentMethod] ?? order.paymentMethod}
          </p>
          <p className="mt-0.5 text-sm capitalize text-navy-800/70">Status: {order.paymentStatus}</p>
          <p className="mt-0.5 text-sm capitalize text-navy-800/70">Order Status: {order.status}</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-navy-800/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-900 text-left text-xs font-semibold uppercase tracking-wide text-white">
              <th className="px-4 py-3">Item</th>
              <th className="px-2 py-3 text-right">Price</th>
              <th className="px-2 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {order.items.map((it, i) => (
              <tr key={i} className="border-t border-navy-800/10 align-top">
                <td className="px-4 py-3">
                  <span className="font-medium text-navy-900">{it.name}</span>
                  {(it.size || it.color) && (
                    <span className="block text-xs text-navy-800/50">{[it.size, it.color].filter(Boolean).join(" / ")}</span>
                  )}
                </td>
                <td className="px-2 py-3 text-right text-navy-800/70">{formatPrice(it.unitPrice)}</td>
                <td className="px-2 py-3 text-right text-navy-800/70">{it.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatPrice(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          {order.subtotal !== undefined && (
            <div className="flex justify-between">
              <span className="text-navy-800/70">Subtotal</span>
              <span className="font-semibold text-navy-900">{formatPrice(order.subtotal)}</span>
            </div>
          )}
          {!!order.discountAmount && (
            <div className="flex justify-between">
              <span className="text-navy-800/70">Discount</span>
              <span className="font-semibold text-emerald-600">-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          {order.shipping !== undefined && order.shipping > 0 && (
            <div className="flex justify-between">
              <span className="text-navy-800/70">Shipping</span>
              <span className="font-semibold text-navy-900">{formatPrice(order.shipping)}</span>
            </div>
          )}
          {!!order.taxAmount && (
            <div className="flex justify-between">
              <span className="text-navy-800/70">Tax</span>
              <span className="font-semibold text-navy-900">{formatPrice(order.taxAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-navy-900 px-5 py-3.5">
            <span className="text-base font-bold text-white">Total</span>
            <span className="text-lg font-extrabold text-white">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-sm font-bold tracking-[0.1em] text-navy-900">THANK YOU FOR YOUR BUSINESS!</p>
    </div>
  );
}
