"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderDetail {
  type: "customer" | "reseller" | "pos";
  orderRef: string;
  status: string;
  rejectReason?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string | null;
  subtotal?: number;
  shipping?: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  cost?: number;
  profit?: number;
  amountTendered?: number | null;
  changeDue?: number | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  resellerName?: string;
  resellerEmail?: string;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryStatus?: string | null;
  cashierName?: string;
  koombiyoWaybillId?: string | null;
  koombiyoStatus?: string | null;
  koombiyoUpdatedAt?: string | null;
  createdAt: string;
  items: OrderItem[];
}

const typeLabel: Record<string, string> = {
  customer: "Order Details",
  reseller: "Order Details",
  pos: "POS Sale",
};

const methodLabel: Record<string, string> = {
  cod: "Cash on Delivery",
  onepay: "Card (OnePay)",
  reseller: "Reseller",
  pos_cash: "POS Cash",
  pos_card: "POS Card",
};

// Matches old Beyos's getStatusColor mapping.
function statusColor(status: string): { bg: string; color: string } {
  const s = status.toLowerCase();
  if (["delivered", "completed"].includes(s)) return { bg: "#d1fae5", color: "#065f46" };
  if (["pending", "unpaid"].includes(s)) return { bg: "#fef3c7", color: "#92400e" };
  if (["processing", "paid", "confirmed"].includes(s)) return { bg: "#dbeafe", color: "#1e40af" };
  if (["out_for_delivery", "shipped"].includes(s)) return { bg: "#e0e7ff", color: "#3730a3" };
  if (["cancelled", "failed", "rejected"].includes(s)) return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#f3f4f6", color: "#374151" };
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function OrderDetailView({ orderRef }: { orderRef: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    fetch(`/api/admin/orders/${encodeURIComponent(orderRef)}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load order");
        setOrder(d.order);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load order"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [orderRef]);

  if (loading) {
    return <div className="mt-10 text-center text-navy-800/50">Loading…</div>;
  }
  if (error || !order) {
    return <div className="mt-10 text-center text-red-600">{error || "Order not found"}</div>;
  }

  const status = statusColor(order.status);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">{typeLabel[order.type]}</h1>
          <p className="mt-1 text-sm text-navy-800/50">Order ID: #{order.orderRef}</p>
        </div>
      </div>

      {order.rejectReason && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Rejected: {order.rejectReason}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Information */}
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Customer Information</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Name" value={order.customerName} bg="#eff6ff" color="#1e40af" />
              {order.customerPhone && <InfoBlock label="Phone" value={order.customerPhone} bg="#f0fdf4" color="#15803d" />}
              {order.customerEmail && <InfoBlock label="Email" value={order.customerEmail} bg="#fef3c7" color="#92400e" />}
              {(order.address || order.deliveryAddress) && (
                <InfoBlock
                  label="Address"
                  value={[order.address || order.deliveryAddress, order.city || order.deliveryCity, order.district, order.province, order.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                  bg="#fee2e2"
                  color="#991b1b"
                />
              )}
            </div>
            {order.notes && (
              <div className="mt-4 border-t border-navy-800/10 pt-4 text-sm text-navy-800/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">Notes</p>
                <p className="mt-1">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="rounded-2xl border border-navy-800/5 bg-white shadow-sm">
            <div className="px-6 pt-6">
              <h2 className="font-bold text-navy-800">Order Items</h2>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-800/10 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Details</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Qty</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No items found</td></tr>
                  ) : (
                    order.items.map((item, i) => (
                      <tr key={i} className="border-b border-navy-800/5 last:border-0">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-50 font-semibold text-navy-800/60">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium text-navy-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-xs text-navy-800/55">
                          {[item.size, item.color].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-6 py-3 text-navy-800/70">{formatPrice(item.unitPrice)}</td>
                        <td className="px-6 py-3">
                          <span className="badge bg-navy-50 text-navy-800">{item.quantity}</span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-navy-800">{formatPrice(item.lineTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-navy-800/10 px-6 py-4 space-y-1.5 text-sm">
              {order.subtotal !== undefined && (
                <div className="flex justify-between text-navy-800/70">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
              )}
              {order.shipping !== undefined && (
                <div className="flex justify-between text-navy-800/70">
                  <span>Shipping</span><span>{formatPrice(order.shipping)}</span>
                </div>
              )}
              {order.discountAmount ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>-{formatPrice(order.discountAmount)}</span>
                </div>
              ) : null}
              {order.taxAmount ? (
                <div className="flex justify-between text-navy-800/70">
                  <span>Tax</span><span>{formatPrice(order.taxAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-navy-800/10 pt-1.5 text-lg font-bold text-brand">
                <span>Total</span><span>{formatPrice(order.total)}</span>
              </div>
              {order.type === "reseller" && order.cost !== undefined && order.profit !== undefined && (
                <div className="flex justify-between pt-1.5 text-xs text-navy-800/45">
                  <span>Cost {formatPrice(order.cost)}</span>
                  <span>Profit {formatPrice(order.profit)}</span>
                </div>
              )}
              {order.type === "pos" && order.amountTendered != null && (
                <div className="flex justify-between pt-1.5 text-xs text-navy-800/45">
                  <span>Tendered {formatPrice(order.amountTendered)}</span>
                  <span>Change {formatPrice(order.changeDue ?? 0)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Order Status</h2>
            <div
              className="mt-4 rounded-lg py-3 text-center text-sm font-bold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {formatStatus(order.status)}
            </div>
          </div>

          {/* Order Information */}
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Order Information</h2>
            <div className="mt-3 space-y-2">
              <InfoRow label="Order Date" value={new Date(order.createdAt).toLocaleString("en-GB")} />
              <InfoRow
                label="Order From"
                value={
                  <span
                    className="badge capitalize"
                    style={
                      order.type === "reseller"
                        ? { backgroundColor: "#f3e8ff", color: "#6b21a8" }
                        : { backgroundColor: "#dbeafe", color: "#1e40af" }
                    }
                  >
                    {order.type === "pos" ? "POS" : order.type}
                  </span>
                }
              />
              {order.type === "pos" && order.cashierName && <InfoRow label="Cashier" value={order.cashierName} />}
            </div>
          </div>

          {/* Payment Details */}
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Payment Details</h2>
            <div className="mt-3 space-y-2">
              <InfoRow label="Payment Method" value={methodLabel[order.paymentMethod] ?? order.paymentMethod} />
              <InfoRow
                label="Payment Status"
                value={
                  <span
                    className="badge capitalize"
                    style={
                      order.paymentStatus === "paid"
                        ? { backgroundColor: "#d1fae5", color: "#065f46" }
                        : { backgroundColor: "#fef3c7", color: "#92400e" }
                    }
                  >
                    {order.paymentStatus}
                  </span>
                }
              />
              {order.paymentRef && <InfoRow label="Reference" value={order.paymentRef} />}
            </div>
          </div>

          {order.type === "reseller" && (order.resellerName || order.resellerEmail) && (
            <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-navy-800">Reseller</h2>
              <div className="mt-3 space-y-1 text-sm text-navy-800/70">
                {order.resellerName && <p className="font-medium text-navy-800">{order.resellerName}</p>}
                {order.resellerEmail && <p>{order.resellerEmail}</p>}
              </div>
            </div>
          )}

          {/* Tracking Info */}
          {order.koombiyoWaybillId && (
            <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-navy-800">Tracking Info</h2>
              <div className="mt-3 space-y-2">
                <InfoRow label="Carrier" value="Koombiyo" />
                <InfoRow label="Tracking Number" value={order.koombiyoWaybillId} />
                {order.koombiyoStatus && <InfoRow label="Courier Status" value={order.koombiyoStatus} />}
              </div>
            </div>
          )}
        </div>
      </div>

      {(order.type === "customer" || order.type === "reseller") && (
        <KoombiyoWizard order={order} onUpdated={load} />
      )}
    </div>
  );
}

function InfoBlock({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{ backgroundColor: bg, color }}
      >
        {label.charAt(0)}
      </span>
      <div>
        <p className="text-xs text-navy-800/50">{label}</p>
        <p className="text-sm font-semibold text-navy-800">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-navy-800/60">{label}:</span>
      {typeof value === "string" ? (
        <span className="text-sm font-semibold text-navy-800">{value}</span>
      ) : (
        value
      )}
    </div>
  );
}

// Mirrors old Beyos: Step 1 (PENDING) request a waybill ID, then place the
// order with Koombiyo manually once the waybill looks right.
function KoombiyoWizard({ order, onUpdated }: { order: OrderDetail; onUpdated: () => void }) {
  const [waybillId, setWaybillId] = useState(order.koombiyoWaybillId ?? "");
  const [specialNote, setSpecialNote] = useState("");
  const [busy, setBusy] = useState<"waybill" | "place" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => setWaybillId(order.koombiyoWaybillId ?? ""), [order.koombiyoWaybillId]);

  if (order.status === "cancelled" || order.status === "rejected") return null;

  const requestWaybill = async () => {
    setBusy("waybill");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/orders/koombiyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef: order.orderRef, action: "request-waybill", type: order.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not request a waybill ID");
      setWaybillId(data.waybillId);
      setSuccess("Waybill ID retrieved successfully");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request a waybill ID");
    } finally {
      setBusy(null);
    }
  };

  const placeOrder = async () => {
    setBusy("place");
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/orders/koombiyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef: order.orderRef, action: "place-order", type: order.type, specialNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not place the order with Koombiyo");
      setSuccess("Order successfully placed with Koombiyo courier");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order with Koombiyo");
    } finally {
      setBusy(null);
    }
  };

  const isPending = order.status === "pending";

  return (
    <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
      <h2 className="font-bold text-navy-800">Koombiyo Delivery Management</h2>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{success}</p>}

      {isPending ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Waybill ID</label>
            <div className="flex items-center gap-3">
              <input
                readOnly
                value={waybillId}
                placeholder="Click 'Request Way Bill ID' to get a waybill"
                className="input flex-1 bg-navy-50 text-navy-800/70"
              />
              <button
                onClick={requestWaybill}
                disabled={busy !== null}
                className="btn-primary shrink-0 disabled:opacity-50"
              >
                {busy === "waybill" ? "Requesting…" : "Request Way Bill ID"}
              </button>
            </div>
          </div>

          {waybillId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Special Notes</label>
              <textarea
                value={specialNote}
                onChange={(e) => setSpecialNote(e.target.value)}
                rows={3}
                className="input w-full resize-none"
              />
              <button
                onClick={placeOrder}
                disabled={busy !== null}
                className="btn-primary mt-3 w-full py-3 disabled:opacity-50"
              >
                {busy === "place" ? "Processing…" : "Place Order"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-800/70">
          Waybill ID: <span className="font-mono font-semibold text-navy-800">{order.koombiyoWaybillId || "—"}</span>
          {order.koombiyoStatus && <span className="ml-3 text-navy-800/55">Status: {order.koombiyoStatus}</span>}
        </div>
      )}
    </div>
  );
}
