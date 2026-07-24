"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatPrice } from "@/lib/utils";

interface VariantRow {
  sku: string;
  size: string;
  color: string;
  label: string;
  unitPrice: string | number;
  stock: number | null;
  sold: number;
  totalRevenue: number;
}
interface SaleDetailRow {
  slug: string;
  productName: string;
  sku: string;
  image: string | null;
  category: string | null;
  type: string;
  unitPrice: string | number;
  unitsSold: number;
  totalRevenue: number;
  date: string;
  time: string;
  variantBreakdown: VariantRow[];
}
interface FlatRow {
  key: string;
  slug: string;
  productName: string;
  image: string | null;
  category: string | null;
  type: string;
  sku: string;
  attribute: string;
  unitPrice: string | number;
  stock: number | null;
  unitsSold: number;
  totalRevenue: number;
}
interface ChartPoint { date: string; label: string; revenue: number; itemsSold: number; }
interface ReportData {
  range: { startDate: string; endDate: string; startTime: string; endTime: string };
  summary: { totalRevenue: number; itemsSold: number; totalOrders: number; itemValue: number };
  chart: ChartPoint[];
  salesDetails: SaleDetailRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
interface Category { name: string; slug: string; }

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function priceLabel(v: string | number) {
  if (typeof v === "number") return formatPrice(v);
  const parts = v.split("-");
  return parts.length === 2 ? `${formatPrice(Number(parts[0]))} - ${formatPrice(Number(parts[1]))}` : formatPrice(Number(v));
}

// One row per variant for variable products (with their own SKU/attribute), one
// row per product for simple products (using the product's own SKU).
function flattenRows(details: SaleDetailRow[]): FlatRow[] {
  return details.flatMap((r) => {
    if (r.type === "variable" && r.variantBreakdown.length > 0) {
      return r.variantBreakdown.map((v, i) => ({
        key: `${r.slug}:${i}`,
        slug: r.slug,
        productName: r.productName,
        image: r.image,
        category: r.category,
        type: r.type,
        sku: v.sku,
        attribute: v.label || "Standard",
        unitPrice: v.unitPrice,
        stock: v.stock,
        unitsSold: v.sold,
        totalRevenue: v.totalRevenue,
      }));
    }
    return [{
      key: r.slug,
      slug: r.slug,
      productName: r.productName,
      image: r.image,
      category: r.category,
      type: r.type,
      sku: r.sku,
      attribute: "—",
      unitPrice: r.unitPrice,
      stock: null,
      unitsSold: r.unitsSold,
      totalRevenue: r.totalRevenue,
    }];
  });
}

export default function ItemReportPage() {
  const today = useMemo(() => todayStr(), []);
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("23:59");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const load = () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      startDate, startTime, endDate, endTime, page: String(page), limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());
    if (type) params.set("type", type);
    if (category) params.set("category", category);

    fetch(`/api/admin/reports/item?${params.toString()}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load report");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, limit]); // eslint-disable-line

  const isDefaultRange = startDate === today && endDate === today && startTime === "00:00" && endTime === "23:59";

  const flatRows = useMemo(() => (data ? flattenRows(data.salesDetails) : []), [data]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Product", "SKU", "Attribute", "Type", "Category", "Unit Price", "Units Sold", "Total Revenue"],
      ...flatRows.map((r) => [
        r.productName, r.sku, r.attribute, r.type, r.category ?? "", String(r.unitPrice), String(r.unitsSold), r.totalRevenue.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beyos-item-report-${data.range.startDate}_to_${data.range.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = data
    ? [
        { label: "Total Revenue", value: formatPrice(data.summary.totalRevenue), icon: "dollar" },
        { label: "Items Sold", value: data.summary.itemsSold.toLocaleString(), icon: "box" },
        { label: "Total Orders", value: data.summary.totalOrders.toLocaleString(), icon: "cart" },
        { label: "Item Value", value: formatPrice(data.summary.itemValue), icon: "trend" },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Item Report</h1>
          <p className="mt-1 text-sm text-navy-800/50">Units sold and revenue per product, across storefront, reseller, and POS sales.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data || data.salesDetails.length === 0}
          className="btn-outline flex items-center gap-2 disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Start Date</label>
          <input type="date" value={startDate} max={endDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Start Time</label>
          <input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setPage(1); }} className="input w-28" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">End Date</label>
          <input type="date" value={endDate} min={startDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">End Time</label>
          <input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setPage(1); }} className="input w-28" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name…" className="input w-44" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Type</label>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="input w-32">
            <option value="">All</option>
            <option value="simple">Simple</option>
            <option value="variable">Variable</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Category</label>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="input w-36">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <button onClick={() => { setPage(1); load(); }} className="btn-primary">Apply</button>
        {!isDefaultRange && (
          <button
            onClick={() => { setStartDate(today); setStartTime("00:00"); setEndDate(today); setEndTime("23:59"); setSearch(""); setType(""); setCategory(""); setPage(1); }}
            className="rounded-lg border border-navy-800/15 px-3 py-2 text-xs font-semibold text-navy-800/70 hover:border-brand hover:text-brand"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(loading ? Array.from({ length: 4 }) : cards).map((c: any, i) => (
          <div key={i} className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-navy-800/50">{loading ? "…" : c.label}</p>
              {!loading && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <StatIcon name={c.icon} />
                </span>
              )}
            </div>
            <p className="mt-2 text-lg font-extrabold text-navy-800">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Item Chart</h2>
        <p className="text-sm text-navy-800/50">Daily revenue for the selected range.</p>
        {loading ? (
          <p className="mt-8 text-navy-800/50">Loading…</p>
        ) : !data || data.chart.length === 0 ? (
          <p className="mt-8 text-navy-800/50">No chart data found.</p>
        ) : (
          <ItemChart points={data.chart} />
        )}
      </div>

      {/* Sales details */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Sales Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Attribute</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3">Units Sold</th>
                <th className="px-6 py-3">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
              ) : flatRows.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-navy-800/50">No sales details found.</td></tr>
              ) : (
                flatRows.map((r) => (
                  <tr key={r.key} className="border-b border-navy-800/5 last:border-0 hover:bg-navy-50/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-navy-50">
                          {r.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.image} alt={r.productName} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-navy-800/30">—</span>
                          )}
                        </span>
                        <span className="font-medium text-navy-800">{r.productName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-navy-800/70">{r.sku || "—"}</td>
                    <td className="px-6 py-3 text-navy-800/70">{r.attribute}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${r.type === "variable" ? "bg-brand/10 text-brand" : "bg-navy-50 text-navy-800/60"}`}>
                        {r.type === "variable" ? "Variable" : "Simple"}
                      </span>
                    </td>
                    <td className="px-6 py-3 capitalize text-navy-800/70">{r.category ?? "—"}</td>
                    <td className="px-6 py-3 text-navy-800/70">{priceLabel(r.unitPrice)}</td>
                    <td className="px-6 py-3 font-semibold text-navy-800">{r.unitsSold}</td>
                    <td className="px-6 py-3 font-semibold text-navy-800">{formatPrice(r.totalRevenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.pagination.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-800/10 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-navy-800/50">
              <span>Rows per page</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border border-navy-800/10 bg-white px-2 py-1 text-xs text-navy-800"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="ml-2">
                {(data.pagination.page - 1) * data.pagination.limit + 1}–{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.pagination.page <= 1}
                className="rounded-lg border border-navy-800/10 px-3 py-1.5 text-xs font-semibold text-navy-800 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={data.pagination.page >= data.pagination.totalPages}
                className="rounded-lg border border-navy-800/10 px-3 py-1.5 text-xs font-semibold text-navy-800 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function ItemChart({ points }: { points: ChartPoint[] }) {
  return (
    <div className="mt-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#666" tick={{ fontSize: 12 }} />
          <YAxis stroke="#666" tick={{ fontSize: 12 }} tickFormatter={(v) => formatPrice(v)} width={90} />
          <Tooltip
            formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
            labelStyle={{ color: "#0f2540", fontWeight: 600 }}
            contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const c = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "dollar") return <svg {...c}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (name === "trend") return <svg {...c}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
  if (name === "box") return <svg {...c}><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>;
  return <svg {...c}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
}
