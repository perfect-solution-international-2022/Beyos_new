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
    <div className="mx-auto w-full max-w-[420px] bg-white px-6 py-8 font-mono text-[#1a1a1a] print:max-w-none">
      <div className="flex flex-col items-center text-center">
        <Image src="/images/logo.png" alt="Beyos Clothing" width={120} height={60} className="h-auto w-28 object-contain" />
        <p className="mt-3 text-xs leading-relaxed">Kendagaha junction, Elpitiya 80458</p>
        <p className="text-xs leading-relaxed">Tel: +94 77 170 3844</p>
      </div>

      <div className="my-4 border-t border-dashed border-[#1a1a1a]/40" />

      <p className="text-center text-sm font-bold tracking-wide">*** RECEIPT BILL ***</p>

      <div className="my-4 border-t border-dashed border-[#1a1a1a]/40" />

      <div className="text-xs leading-relaxed">
        <p>Bill No: {receipt.receiptNumber}</p>
        <p>
          Date:{" "}
          {date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })},{" "}
          {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
        </p>
        {receipt.customerName && receipt.customerName !== "Walk-in Customer" && <p>Customer: {receipt.customerName}</p>}
      </div>

      {receipt.fulfillmentType === "delivery" && (
        <div className="mt-3 text-xs leading-relaxed">
          <p className="font-bold">Deliver to:</p>
          <p>{receipt.deliveryAddress}</p>
          {receipt.deliveryCity && <p>{receipt.deliveryCity}</p>}
        </div>
      )}

      <div className="my-4 border-t border-dashed border-[#1a1a1a]/40" />

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1a1a1a]/40 text-left">
            <th className="w-6 pb-2 font-bold">No.</th>
            <th className="pb-2 font-bold">Product</th>
            <th className="pb-2 font-bold">SKU</th>
            <th className="pb-2 text-right font-bold">Price</th>
            <th className="pb-2 text-right font-bold">QTY</th>
            <th className="pb-2 text-right font-bold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((it, i) => (
            <tr key={i} className="align-top">
              <td className="py-1.5">{i + 1}</td>
              <td className="py-1.5 pr-2">
                {it.name}
                {(it.size || it.color) && (
                  <span className="block text-[10px] text-[#1a1a1a]/60">{[it.size, it.color].filter(Boolean).join(" / ")}</span>
                )}
              </td>
              <td className="py-1.5">{it.sku || "—"}</td>
              <td className="py-1.5 text-right">{it.unitPrice.toFixed(2)}</td>
              <td className="py-1.5 text-right">{it.quantity}</td>
              <td className="py-1.5 text-right">{it.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-[#1a1a1a]/40" />

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{billPrice(receipt.subtotal)}</span>
        </div>
        {receipt.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{billPrice(receipt.discountAmount)}</span>
          </div>
        )}
        {receipt.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{billPrice(receipt.taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 text-base font-bold">
          <span>Grand Total</span>
          <span>{billPrice(receipt.total)}</span>
        </div>
        {receipt.paymentMethod === "cash" && receipt.amountTendered !== null && (
          <>
            <div className="flex justify-between text-xs text-[#1a1a1a]/70">
              <span>Cash Tendered</span>
              <span>{billPrice(receipt.amountTendered)}</span>
            </div>
            <div className="flex justify-between text-xs text-[#1a1a1a]/70">
              <span>Change</span>
              <span>{billPrice(receipt.changeDue ?? 0)}</span>
            </div>
          </>
        )}
        {receipt.paymentMethod === "card" && (
          <div className="flex justify-between text-xs text-[#1a1a1a]/70">
            <span>Payment Method</span>
            <span>Card</span>
          </div>
        )}
      </div>

      <div className="my-4 border-t border-dashed border-[#1a1a1a]/40" />

      <p className="text-center text-sm font-bold">THANK YOU FOR YOUR PURCHASE!</p>
    </div>
  );
}
