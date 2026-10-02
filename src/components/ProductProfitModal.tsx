"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface PriceTier {
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
  concession: number;
}

interface ChannelData {
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

interface VariantItem {
  variant: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

interface RecentOrder {
  id: number;
  reference: string;
  customerName: string;
  channel: "website" | "pos" | "reseller";
  date: string;
  time: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
  lineProfit: number;
  priceType: "regular" | "sale" | "wholesale" | "reseller";
  priceTypeLabel: string;
  concession: number;
  isCostEstimated: boolean;
}

interface ProductProfitDetail {
  product: {
    id: number;
    slug: string;
    name: string;
    image: string | null;
    regularPrice: number;
    salePrice: number | null;
    wholesalePrice: number | null;
    productionCost: number | null;
    hasConfiguredCost: boolean;
  };
  range: { start: string; end: string };
  summary: {
    totalUnits: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    marginPct: number;
    totalConcession: number;
  };
  byPriceType: {
    regular: PriceTier;
    sale: PriceTier;
    wholesale: PriceTier;
    reseller: PriceTier;
  };
  byChannel: {
    pos: ChannelData;
    website: ChannelData;
    reseller: ChannelData;
  };
  variants: VariantItem[];
  recentOrders: RecentOrder[];
}

export default function ProductProfitModal({
  slug,
  start,
  end,
  onClose,
}: {
  slug: string;
  start: string;
  end: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ProductProfitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"priceTiers" | "variants" | "orders">("priceTiers");

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/reports/profit-loss/product?slug=${encodeURIComponent(slug)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load product details");
        if (!ignore) setData(json);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [slug, start, end]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-800/10 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {data?.product.image ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-navy-800/10 bg-navy-50">
                <Image src={data.product.image} alt="" fill className="object-cover" />
              </div>
            ) : (
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 font-bold text-navy-800/50">
                📦
              </div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-navy-900">
                {data ? data.product.name : "Loading Product…"}
              </h2>
              <p className="text-xs text-navy-800/60">
                Period: {start} to {end}
                {data && (
                  <span className="ml-2 font-medium text-navy-800/80">
                    · Regular: {formatPrice(data.product.regularPrice)}
                    {data.product.wholesalePrice ? ` · Wholesale: ${formatPrice(data.product.wholesalePrice)}` : ""}
                    {data.product.productionCost ? ` · Unit Cost: ${formatPrice(data.product.productionCost)}` : ""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-navy-800/50 hover:bg-navy-50 hover:text-navy-900 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-navy-800/50">Loading detailed profit analysis…</div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
          ) : !data ? null : (
            <div className="space-y-6">
              {/* Summary 4-card grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-navy-800/10 bg-navy-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-800/50">Units Sold</p>
                  <p className="mt-1 text-2xl font-extrabold text-navy-900">{data.summary.totalUnits.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-navy-800/50">Across all orders</p>
                </div>
                <div className="rounded-xl border border-navy-800/10 bg-navy-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-800/50">Gross Revenue</p>
                  <p className="mt-1 text-2xl font-extrabold text-navy-900">{formatPrice(data.summary.totalRevenue)}</p>
                  <p className="mt-1 text-[11px] text-navy-800/50">
                    Avg: {formatPrice(data.summary.totalUnits > 0 ? data.summary.totalRevenue / data.summary.totalUnits : 0)} / unit
                  </p>
                </div>
                <div className="rounded-xl border border-navy-800/10 bg-navy-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-navy-800/50">Total Cost</p>
                  <p className="mt-1 text-2xl font-extrabold text-navy-900">{formatPrice(data.summary.totalCost)}</p>
                  <p className="mt-1 text-[11px] text-navy-800/60 flex items-center gap-1">
                    {data.product.hasConfiguredCost ? (
                      <span className="text-emerald-700 font-medium">✓ Configured cost</span>
                    ) : (
                      <span className="text-amber-700 font-medium">⚠ Estimated (55%)</span>
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70">Real Profit</p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-700">{formatPrice(data.summary.totalProfit)}</p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">{data.summary.marginPct.toFixed(1)}% margin</p>
                </div>
              </div>

              {/* Price Concessions Alert if applicable */}
              {data.summary.totalConcession > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <span className="text-base">💡</span>
                  <div>
                    <strong>Price Concessions (Lost Profit vs List Price): {formatPrice(data.summary.totalConcession)}</strong>
                    <p className="mt-0.5 text-amber-800/80">
                      If all {data.summary.totalUnits} units were sold at full Regular Retail price ({formatPrice(data.product.regularPrice)}), potential revenue would have been {formatPrice(data.summary.totalRevenue + data.summary.totalConcession)}.
                    </p>
                  </div>
                </div>
              )}

              {/* Channels summary bar */}
              <div className="rounded-xl border border-navy-800/10 bg-white p-4 shadow-2xs">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-800/50">Sales by Channel</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-navy-50/60 p-2.5">
                    <p className="text-xs text-navy-800/60">POS (Store Counter)</p>
                    <p className="text-base font-bold text-navy-900">{data.byChannel.pos.units} units</p>
                    <p className="text-xs font-semibold text-emerald-600">{formatPrice(data.byChannel.pos.profit)} profit</p>
                  </div>
                  <div className="rounded-lg bg-blue-50/60 p-2.5">
                    <p className="text-xs text-blue-800/70">Website Orders</p>
                    <p className="text-base font-bold text-navy-900">{data.byChannel.website.units} units</p>
                    <p className="text-xs font-semibold text-emerald-600">{formatPrice(data.byChannel.website.profit)} profit</p>
                  </div>
                  <div className="rounded-lg bg-purple-50/60 p-2.5">
                    <p className="text-xs text-purple-800/70">Reseller Orders</p>
                    <p className="text-base font-bold text-navy-900">{data.byChannel.reseller.units} units</p>
                    <p className="text-xs font-semibold text-emerald-600">{formatPrice(data.byChannel.reseller.profit)} profit</p>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for detailed breakdown */}
              <div>
                <div className="flex border-b border-navy-800/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab("priceTiers")}
                    className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                      activeTab === "priceTiers"
                        ? "border-brand text-brand"
                        : "border-transparent text-navy-800/60 hover:text-navy-900"
                    }`}
                  >
                    💰 Price Tiers (Regular vs Sale vs Wholesale)
                  </button>
                  {data.variants.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("variants")}
                      className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                        activeTab === "variants"
                          ? "border-brand text-brand"
                          : "border-transparent text-navy-800/60 hover:text-navy-900"
                      }`}
                    >
                      🏷️ Sizes &amp; Colors ({data.variants.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                      activeTab === "orders"
                        ? "border-brand text-brand"
                        : "border-transparent text-navy-800/60 hover:text-navy-900"
                    }`}
                  >
                    📄 Order History ({data.recentOrders.length})
                  </button>
                </div>

                {/* Tab 1: Price Tiers Breakdown */}
                {activeTab === "priceTiers" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {/* Regular Tier */}
                    <div className="rounded-xl border border-navy-800/10 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                          Regular Price
                        </span>
                        <span className="text-xs text-navy-800/50">{data.byPriceType.regular.units} units</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-navy-800/80">
                        <div className="flex justify-between">
                          <span>Revenue:</span>
                          <span className="font-semibold text-navy-900">{formatPrice(data.byPriceType.regular.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span>{formatPrice(data.byPriceType.regular.cost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-navy-800/10 pt-1 text-sm font-bold text-emerald-600">
                          <span>Profit:</span>
                          <span>{formatPrice(data.byPriceType.regular.profit)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-navy-800/50">
                          <span>Margin:</span>
                          <span>{data.byPriceType.regular.marginPct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Sale / Selling Tier */}
                    <div className="rounded-xl border border-navy-800/10 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          Selling / Sale Price
                        </span>
                        <span className="text-xs text-navy-800/50">{data.byPriceType.sale.units} units</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-navy-800/80">
                        <div className="flex justify-between">
                          <span>Revenue:</span>
                          <span className="font-semibold text-navy-900">{formatPrice(data.byPriceType.sale.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span>{formatPrice(data.byPriceType.sale.cost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-navy-800/10 pt-1 text-sm font-bold text-emerald-600">
                          <span>Profit:</span>
                          <span>{formatPrice(data.byPriceType.sale.profit)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-navy-800/50">
                          <span>Margin:</span>
                          <span>{data.byPriceType.sale.marginPct.toFixed(1)}%</span>
                        </div>
                        {data.byPriceType.sale.concession > 0 && (
                          <div className="flex justify-between text-[10px] text-red-600">
                            <span>Discount Given:</span>
                            <span>−{formatPrice(data.byPriceType.sale.concession)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Wholesale Tier */}
                    <div className="rounded-xl border border-navy-800/10 bg-white p-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                          Wholesale Price
                        </span>
                        <span className="text-xs text-navy-800/50">{data.byPriceType.wholesale.units} units</span>
                      </div>
                      <div className="mt-3 space-y-1.5 text-xs text-navy-800/80">
                        <div className="flex justify-between">
                          <span>Revenue:</span>
                          <span className="font-semibold text-navy-900">{formatPrice(data.byPriceType.wholesale.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost:</span>
                          <span>{formatPrice(data.byPriceType.wholesale.cost)}</span>
                        </div>
                        <div className="flex justify-between border-t border-navy-800/10 pt-1 text-sm font-bold text-emerald-600">
                          <span>Profit:</span>
                          <span>{formatPrice(data.byPriceType.wholesale.profit)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-navy-800/50">
                          <span>Margin:</span>
                          <span>{data.byPriceType.wholesale.marginPct.toFixed(1)}%</span>
                        </div>
                        {data.byPriceType.wholesale.concession > 0 && (
                          <div className="flex justify-between text-[10px] text-purple-700">
                            <span>Wholesale Concession:</span>
                            <span>−{formatPrice(data.byPriceType.wholesale.concession)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Variants Breakdown */}
                {activeTab === "variants" && (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-navy-800/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-navy-50/60 text-navy-800/60">
                        <tr>
                          <th className="px-4 py-2.5">Variant (Size / Color)</th>
                          <th className="px-4 py-2.5 text-center">Units</th>
                          <th className="px-4 py-2.5">Revenue</th>
                          <th className="px-4 py-2.5">Cost</th>
                          <th className="px-4 py-2.5">Profit</th>
                          <th className="px-4 py-2.5">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-800/5">
                        {data.variants.map((v) => (
                          <tr key={v.variant} className="hover:bg-navy-50/30">
                            <td className="px-4 py-2 font-medium text-navy-900">{v.variant}</td>
                            <td className="px-4 py-2 text-center font-bold text-navy-900">{v.units}</td>
                            <td className="px-4 py-2 text-navy-800/80">{formatPrice(v.revenue)}</td>
                            <td className="px-4 py-2 text-navy-800/60">{formatPrice(v.cost)}</td>
                            <td className="px-4 py-2 font-semibold text-emerald-600">{formatPrice(v.profit)}</td>
                            <td className="px-4 py-2 text-navy-800/60">{v.marginPct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab 3: Order History */}
                {activeTab === "orders" && (
                  <div className="mt-4 max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-navy-800/10">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-navy-50/90 backdrop-blur-xs text-navy-800/60">
                        <tr>
                          <th className="px-3.5 py-2.5">Date</th>
                          <th className="px-3.5 py-2.5">Order Ref</th>
                          <th className="px-3.5 py-2.5">Customer</th>
                          <th className="px-3.5 py-2.5">Variant</th>
                          <th className="px-3.5 py-2.5">Price Tier</th>
                          <th className="px-3.5 py-2.5 text-center">Qty</th>
                          <th className="px-3.5 py-2.5">Unit Price</th>
                          <th className="px-3.5 py-2.5">Total</th>
                          <th className="px-3.5 py-2.5">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-navy-800/5">
                        {data.recentOrders.map((o, idx) => {
                          const badgeColor =
                            o.priceType === "wholesale"
                              ? "bg-purple-100 text-purple-800"
                              : o.priceType === "sale"
                              ? "bg-amber-100 text-amber-800"
                              : o.priceType === "reseller"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-blue-100 text-blue-800";

                          const linkHref =
                            o.channel === "pos"
                              ? `/admin/pos/sales/${o.reference}`
                              : o.channel === "website"
                              ? `/admin/orders/${o.reference}`
                              : `/admin/resellers`;

                          return (
                            <tr key={`${o.reference}-${idx}`} className="hover:bg-navy-50/30">
                              <td className="px-3.5 py-2 text-navy-800/60">{o.date}</td>
                              <td className="px-3.5 py-2 font-mono font-medium text-brand">
                                <Link href={linkHref} target="_blank" className="hover:underline">
                                  {o.reference}
                                </Link>
                              </td>
                              <td className="px-3.5 py-2 text-navy-900 truncate max-w-[120px]">{o.customerName}</td>
                              <td className="px-3.5 py-2 text-navy-800/70">{o.variant}</td>
                              <td className="px-3.5 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                                  {o.priceTypeLabel}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 text-center font-bold text-navy-900">{o.quantity}</td>
                              <td className="px-3.5 py-2 text-navy-800/70">{formatPrice(o.unitPrice)}</td>
                              <td className="px-3.5 py-2 font-semibold text-navy-900">{formatPrice(o.lineTotal)}</td>
                              <td className="px-3.5 py-2 font-bold text-emerald-600">{formatPrice(o.lineProfit)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-navy-800/10 px-6 py-3.5 bg-gray-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
