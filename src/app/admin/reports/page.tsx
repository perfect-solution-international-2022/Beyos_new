"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Summary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalProfit: number;
  unitsSold: number;
  customerRevenue: number;
  resellerRevenue: number;
  topSalesDay: { date: string; revenue: number } | null;
}
interface TrendPoint { date: string; revenue: number; }
interface TopProduct { name: string; revenue: number; units: number; }
interface CategoryRow { category: string; revenue: number; }
interface StatusRow { status: string; count: number; }
interface ProductRow { slug: string; name: string; revenue: number; units: number; }

interface ReportData {
  range: { start: string; end: string };
  summary: Summary;
  trend: TrendPoint[];
  topProducts: TopProduct[];
  categoryBreakdown: CategoryRow[];
  statusBreakdown: StatusRow[];
  productTable: ProductRow[];
}

const DONUT_COLORS = ["#f5851f", "#0f2540", "#f79b42", "#173a63", "#fbbf24", "#64748b"];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export default function SalesReportPage() {
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(toISODate(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (s: string, e: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/reports/overview?start=${s}&end=${e}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load report");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(start, end), []); // eslint-disable-line

  const applyPreset = (days: number) => {
    const s = daysAgo(days - 1);
    const e = toISODate(new Date());
    setStart(s); setEnd(e);
    load(s, e);
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Product", "Units Sold", "Revenue"],
      ...data.productTable.map((p) => [p.name, String(p.units), p.revenue.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beyos-sales-report-${data.range.start}_to_${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map((t) => t.revenue) ?? [1])), [data]);
  const maxProduct = useMemo(() => Math.max(1, ...(data?.topProducts.map((p) => p.revenue) ?? [1])), [data]);
  const catTotal = useMemo(() => (data?.categoryBreakdown.reduce((s, c) => s + c.revenue, 0) ?? 0) || 1, [data]);

  const cards = data
    ? [
        { label: "Total Revenue", value: formatPrice(data.summary.totalRevenue), icon: "dollar", tone: "green" },
        { label: "Total Orders", value: String(data.summary.totalOrders), icon: "cart", tone: "blue" },
        { label: "Avg Order Value", value: formatPrice(data.summary.avgOrderValue), icon: "trend", tone: "purple" },
        { label: "Est. Profit", value: formatPrice(data.summary.totalProfit), icon: "profit", tone: "amber" },
        { label: "Units Sold", value: String(data.summary.unitsSold), icon: "box", tone: "blue" },
        {
          label: "Top Sales Day",
          value: data.summary.topSalesDay
            ? new Date(data.summary.topSalesDay.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "—",
          icon: "star", tone: "green",
        },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-800">Sales Report</h1>
        <button
          onClick={exportCsv}
          disabled={!data || data.productTable.length === 0}
          className="btn-outline flex items-center gap-2 disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Date range controls */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Start Date</label>
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">End Date</label>
          <input type="date" value={end} min={start} max={toISODate(new Date())} onChange={(e) => setEnd(e.target.value)} className="input" />
        </div>
        <button onClick={() => load(start, end)} className="btn-primary">Apply</button>
        <div className="ml-auto flex gap-2">
          {[{ label: "7D", d: 7 }, { label: "30D", d: 30 }, { label: "90D", d: 90 }].map((p) => (
            <button key={p.label} onClick={() => applyPreset(p.d)} className="rounded-full border border-navy-800/15 px-3 py-1.5 text-xs font-semibold text-navy-800/70 hover:border-brand hover:text-brand">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {(loading ? Array.from({ length: 6 }) : cards).map((c: any, i) => (
          <div key={i} className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-navy-800/50">{loading ? "…" : c.label}</p>
              {!loading && (
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${toneBg[c.tone]}`}>
                  <StatIcon name={c.icon} className={toneText[c.tone]} />
                </span>
              )}
            </div>
            <p className="mt-2 text-lg font-extrabold text-navy-800">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue split */}
      {data && !loading && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-navy-800/60">
          <span className="rounded-full bg-navy-50 px-3 py-1.5">
            Customer revenue: <b className="text-navy-800">{formatPrice(data.summary.customerRevenue)}</b>
          </span>
          <span className="rounded-full bg-navy-50 px-3 py-1.5">
            Reseller revenue: <b className="text-navy-800">{formatPrice(data.summary.resellerRevenue)}</b>
          </span>
        </div>
      )}

      {/* Revenue trend */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Revenue Trend</h2>
        <p className="text-sm text-navy-800/50">Daily revenue for the selected range.</p>
        {loading ? (
          <p className="mt-8 text-navy-800/50">Loading…</p>
        ) : !data || data.trend.length === 0 ? (
          <p className="mt-8 text-navy-800/50">No sales in this range.</p>
        ) : (
          <TrendChart trend={data.trend} max={maxTrend} />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-navy-800">Top Products by Revenue</h2>
          {loading ? (
            <p className="mt-6 text-navy-800/50">Loading…</p>
          ) : !data || data.topProducts.length === 0 ? (
            <p className="mt-6 text-navy-800/50">No sales in this range.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {data.topProducts.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-navy-800/80">{p.name}</span>
                    <span className="font-semibold text-navy-800">{formatPrice(p.revenue)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown (donut) */}
        <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-navy-800">Revenue by Category</h2>
          {loading ? (
            <p className="mt-6 text-navy-800/50">Loading…</p>
          ) : !data || data.categoryBreakdown.length === 0 ? (
            <p className="mt-6 text-navy-800/50">No sales in this range.</p>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
              <Donut data={data.categoryBreakdown} total={catTotal} />
              <div className="flex-1 space-y-2">
                {data.categoryBreakdown.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 capitalize text-navy-800/80">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {c.category}
                    </span>
                    <span className="font-semibold text-navy-800">{Math.round((c.revenue / catTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order status breakdown */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Orders by Status</h2>
        {loading ? (
          <p className="mt-4 text-navy-800/50">Loading…</p>
        ) : !data || data.statusBreakdown.length === 0 ? (
          <p className="mt-4 text-navy-800/50">No orders in this range.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.statusBreakdown.map((s) => {
              const pct = data.summary.totalOrders ? (s.count / data.summary.totalOrders) * 100 : 0;
              return (
                <div key={s.status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize text-navy-800/70">{s.status.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-navy-800">{s.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                    <div className="h-full rounded-full bg-navy-800" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product sales details */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Product Sales Details</h2>
        </div>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Units Sold</th>
              <th className="px-6 py-3">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : !data || data.productTable.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-10 text-center text-navy-800/50">No sales in this range.</td></tr>
            ) : (
              data.productTable.map((p) => (
                <tr key={p.slug} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3 font-medium text-navy-800">{p.name}</td>
                  <td className="px-6 py-3 text-navy-800/70">{p.units}</td>
                  <td className="px-6 py-3 font-semibold text-navy-800">{formatPrice(p.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ trend, max }: { trend: TrendPoint[]; max: number }) {
  const w = 800, h = 220, pad = 24;
  const n = trend.length;
  const xStep = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  const points = trend.map((t, i) => {
    const x = pad + i * xStep;
    const y = h - pad - (t.revenue / max) * (h - pad * 2);
    return { x, y, t };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ maxHeight: 260 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5851f" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f5851f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - pad * 2)} y2={h - pad - f * (h - pad * 2)} stroke="#0f254010" />
        ))}
        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="#f5851f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f5851f">
            <title>{`${p.t.date}: ${formatPrice(p.t.revenue)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-navy-800/40">
        <span>{trend[0]?.date}</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function Donut({ data, total }: { data: CategoryRow[]; total: number }) {
  const size = 140, r = 55, cx = size / 2, cy = size / 2, circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0f254010" strokeWidth="18" />
      {data.map((c, i) => {
        const frac = c.revenue / total;
        const dash = frac * circumference;
        const el = (
          <circle
            key={c.category}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth="18"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

const toneBg: Record<string, string> = { blue: "bg-blue-50", amber: "bg-amber-50", green: "bg-emerald-50", purple: "bg-purple-50" };
const toneText: Record<string, string> = { blue: "text-blue-500", amber: "text-amber-500", green: "text-emerald-500", purple: "text-purple-500" };

function StatIcon({ name, className }: { name: string; className?: string }) {
  const c = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  if (name === "dollar") return <svg {...c}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (name === "trend") return <svg {...c}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
  if (name === "profit") return <svg {...c}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" /></svg>;
  if (name === "box") return <svg {...c}><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>;
  if (name === "star") return <svg {...c} fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01Z" /></svg>;
  return <svg {...c}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
}
