"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  slug: string; name: string; sku: string; variant: string | null; image: string | null;
  quantity: number; resellerPrice: number; sellingPrice: number; lineTotal: number; profit: number;
}
interface OrderDetail {
  orderRef: string;
  customer: { name: string; phone: string; phone2: string | null; email: string | null; address: string; addressLine1: string; addressLine2: string | null; province: string; district: string; city: string; postalCode: string | null };
  notes: string | null; subtotal: number; deliveryFee: number; amount: number; cost: number; profit: number;
  status: string; rejectReason: string | null; paymentStatus: string; waybillNumber: string | null;
  courierStatus: string | null; courierUpdatedAt: string | null; createdAt: string; items: OrderItem[];
}

const STATUS_STEPS = ["pending", "processing", "confirmed", "shipped", "delivered"];

export default function ResellerOrderDetailPage() {
  const { ref } = useParams<{ ref: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reseller/orders/${encodeURIComponent(ref)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load order");
        setOrder(data.order);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load order"))
      .finally(() => setLoading(false));
  }, [ref]);

  if (loading) return <div className="py-20 text-center text-navy-800/50">Loading order details…</div>;
  if (error || !order) return <div className="py-20 text-center text-red-600">{error || "Order not found"}</div>;

  const normalizedStatus = order.status.toLowerCase();
  const currentStep = STATUS_STEPS.indexOf(normalizedStatus);
  const address = [order.customer.addressLine1, order.customer.addressLine2, order.customer.city, order.customer.district, order.customer.province, order.customer.postalCode].filter(Boolean).join(", ") || order.customer.address;

  return (
    <div>
      <Link href="/reseller/orders" className="text-sm font-semibold text-navy-800/55 hover:text-brand">&larr; Back to orders</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Order details</p><h1 className="mt-1 text-2xl font-extrabold text-navy-800">#{order.orderRef}</h1><p className="mt-1 text-sm text-navy-800/50">Placed {new Date(order.createdAt).toLocaleString("en-GB")}</p></div>
        <div className="flex items-center gap-2"><ResellerStatusBadge status={order.status} /><span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-bold capitalize text-navy-800/65">Payment: {order.paymentStatus}</span></div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customer pays" value={formatPrice(order.amount)} />
        <Stat label="Your product cost" value={formatPrice(order.cost - order.deliveryFee)} />
        <Stat label="Your profit" value={formatPrice(order.profit)} tone="green" />
        <Stat label="Waybill number" value={order.waybillNumber || "Not assigned"} compact />
      </div>

      <section className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-navy-800">Order status</h2>{order.courierStatus && <span className="text-sm font-semibold text-indigo-600">Courier: {order.courierStatus}</span>}</div>
        {normalizedStatus === "rejected" || normalizedStatus === "cancelled" ? (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"><b className="capitalize">{normalizedStatus}</b>{order.rejectReason ? ` — ${order.rejectReason}` : ""}</div>
        ) : (
          <div className="mt-6 grid grid-cols-5 gap-1">
            {STATUS_STEPS.map((step, index) => {
              const active = index <= currentStep || normalizedStatus === "completed";
              return <div key={step} className="text-center"><div className={`mx-auto h-2 w-full rounded-full ${active ? "bg-brand" : "bg-navy-100"}`} /><p className={`mt-2 text-[10px] font-bold capitalize sm:text-xs ${active ? "text-brand" : "text-navy-800/35"}`}>{step}</p></div>;
            })}
          </div>
        )}
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Info label="Waybill number" value={order.waybillNumber || "Not assigned yet"} mono /><Info label="Courier status" value={order.courierStatus || "Waiting for courier update"} />{order.courierUpdatedAt && <Info label="Courier updated" value={new Date(order.courierUpdatedAt).toLocaleString("en-GB")} />}</div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-navy-800/5 bg-white shadow-sm">
          <div className="border-b border-navy-800/10 px-6 py-5"><h2 className="font-bold text-navy-800">Products ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h2></div>
          <div className="divide-y divide-navy-800/5">
            {order.items.map((item) => <div key={`${item.sku}-${item.variant}`} className="flex gap-4 p-5">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-navy-50">{item.image ? <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" /> : null}</div>
              <div className="min-w-0 flex-1"><h3 className="font-bold text-navy-800">{item.name}</h3><p className="mt-1 text-xs text-navy-800/45">SKU: {item.sku}{item.variant ? ` · ${item.variant}` : ""}</p><p className="mt-2 text-sm text-navy-800/65">{item.quantity} × {formatPrice(item.sellingPrice)}</p></div>
              <div className="text-right"><p className="font-bold text-navy-800">{formatPrice(item.lineTotal)}</p><p className="mt-1 text-xs font-semibold text-emerald-600">Profit {formatPrice(item.profit)}</p></div>
            </div>)}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm"><h2 className="font-bold text-navy-800">Customer & delivery</h2><div className="mt-5 space-y-4"><Info label="Customer" value={order.customer.name} /><Info label="Phone" value={[order.customer.phone, order.customer.phone2].filter(Boolean).join(" / ")} /><Info label="Email" value={order.customer.email || "—"} /><Info label="Delivery address" value={address} />{order.notes && <Info label="Order notes" value={order.notes} />}</div></section>
          <section className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm"><h2 className="font-bold text-navy-800">Payment summary</h2><div className="mt-5 space-y-3 text-sm"><Money label="Products subtotal" value={order.subtotal} /><Money label="Delivery fee" value={order.deliveryFee} /><Money label="Customer total" value={order.amount} bold /><div className="border-t border-navy-800/10 pt-3"><Money label="Your profit" value={order.profit} green bold /></div></div></section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, compact }: { label: string; value: string; tone?: "green"; compact?: boolean }) { return <div className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">{label}</p><p className={`mt-2 font-extrabold ${compact ? "break-all text-base" : "text-xl"} ${tone === "green" ? "text-emerald-600" : "text-navy-800"}`}>{value}</p></div>; }
function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-navy-800/40">{label}</p><p className={`mt-1 break-words text-sm font-medium text-navy-800 ${mono ? "font-mono" : ""}`}>{value}</p></div>; }
function Money({ label, value, bold, green }: { label: string; value: number; bold?: boolean; green?: boolean }) { return <div className={`flex justify-between gap-3 ${bold ? "font-bold" : "text-navy-800/65"}`}><span>{label}</span><span className={green ? "text-emerald-600" : "text-navy-800"}>{formatPrice(value)}</span></div>; }
