"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface SourceTotals { revenue: number; cost: number; profit: number; }
interface TrendPoint { date: string; revenue: number; cost: number; profit: number; }
interface ProductRow { slug: string; name: string; units: number; revenue: number; cost: number; profit: number; marginPct: number; }
interface ExpenseCategoryRow { category: string; amount: number; }
interface ReportData {
  range: { start: string; end: string };
  summary: {
    totalRevenue: number; totalCost: number; grossProfit: number; grossMarginPct: number;
    totalExpenses: number; netProfit: number; netMarginPct: number;
  };
  bySource: { customer: SourceTotals; reseller: SourceTotals; pos: SourceTotals };
  trend: TrendPoint[];
  productTable: ProductRow[];
  expensesByCategory: ExpenseCategoryRow[];
}

const sourceLabel = { customer: "Customer Orders", reseller: "Reseller Orders", pos: "POS Sales" } as const;
const sourceBadge: Record<keyof typeof sourceLabel, string> = {
  customer: "bg-blue-50 text-blue-700",
  reseller: "bg-purple-50 text-purple-700",
  pos: "bg-navy-50 text-navy-800/70",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

export default function ProfitLossReportPage() {
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(toISODate(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (s: string, e: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/reports/profit-loss?start=${s}&end=${e}`, { cache: "no-store" })
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
      ["Statement Summary", ""],
      ["Revenue", data.summary.totalRevenue.toFixed(2)],
      ["Cost of Goods Sold", (-data.summary.totalCost).toFixed(2)],
      ["Gross Profit", data.summary.grossProfit.toFixed(2)],
      ["Gross Margin %", data.summary.grossMarginPct.toFixed(1)],
      ...data.expensesByCategory.map((e) => [`  ${e.category}`, (-e.amount).toFixed(2)]),
      ["Total Operating Expenses", (-data.summary.totalExpenses).toFixed(2)],
      ["Net Profit", data.summary.netProfit.toFixed(2)],
      ["Net Margin %", data.summary.netMarginPct.toFixed(1)],
      [],
      ["Product", "Units Sold", "Revenue", "Cost", "Profit", "Margin %"],
      ...data.productTable.map((p) => [
        p.name, String(p.units), p.revenue.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2), p.marginPct.toFixed(1),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beyos-profit-loss-report-${data.range.start}_to_${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(
    () => Math.max(1, ...(data?.trend.flatMap((t) => [t.revenue, t.cost]) ?? [1])),
    [data]
  );

  const cards = data
    ? [
        { label: "Total Revenue", value: formatPrice(data.summary.totalRevenue), icon: "dollar", tone: "blue" },
        { label: "Gross Profit", value: formatPrice(data.summary.grossProfit), sub: `${data.summary.grossMarginPct.toFixed(1)}% margin`, icon: "box", tone: "purple" },
        { label: "Operating Expenses", value: formatPrice(data.summary.totalExpenses), icon: "trend", tone: "amber" },
        {
          label: "Net Profit",
          value: formatPrice(data.summary.netProfit),
          sub: `${data.summary.netMarginPct.toFixed(1)}% margin`,
          icon: "profit",
          tone: data.summary.netProfit >= 0 ? "green" : "red",
        },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Profit &amp; Loss Report</h1>
          <p className="mt-1 text-sm text-navy-800/50">Revenue, cost of goods sold, operating expenses, and net profit across all sales channels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/expenses" className="btn-outline flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Manage Expenses
          </Link>
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
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(loading ? Array.from({ length: 4 }) : cards).map((c: any, i) => (
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
            {!loading && c.sub && <p className="mt-0.5 text-xs text-navy-800/45">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* P&L statement */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Statement Summary</h2>
        <p className="text-sm text-navy-800/50">Revenue, cost of goods sold, and operating expenses for the selected range.</p>
        {loading ? (
          <p className="mt-6 text-navy-800/50">Loading…</p>
        ) : !data ? null : (
          <div className="mt-5 text-sm">
            <div className="flex items-center justify-between py-3">
              <span className="text-navy-800/70">Revenue</span>
              <span className="font-semibold text-navy-800">{formatPrice(data.summary.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-navy-800/5 py-3">
              <span className="text-navy-800/70">Less: Cost of Goods Sold</span>
              <span className="font-semibold text-red-600">-{formatPrice(data.summary.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-navy-800/10 bg-navy-50/40 px-3 py-3">
              <span className="font-bold text-navy-800">Gross Profit</span>
              <div className="text-right">
                <span className={`font-extrabold ${data.summary.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatPrice(data.summary.grossProfit)}
                </span>
                <span className="ml-2 text-xs text-navy-800/45">({data.summary.grossMarginPct.toFixed(1)}%)</span>
              </div>
            </div>

            {data.expensesByCategory.length > 0 && (
              <div className="border-t border-navy-800/5 py-3">
                <p className="mb-2 text-navy-800/70">Less: Operating Expenses</p>
                <div className="space-y-1.5 pl-4">
                  {data.expensesByCategory.map((e) => (
                    <div key={e.category} className="flex items-center justify-between text-xs text-navy-800/60">
                      <span>{e.category}</span>
                      <span>-{formatPrice(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-navy-800/5 py-3">
              <span className="text-navy-800/70">Total Operating Expenses</span>
              <span className="font-semibold text-red-600">-{formatPrice(data.summary.totalExpenses)}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border-t border-navy-800/10 bg-navy-800 px-3 py-3 text-white">
              <span className="font-bold">Net Profit</span>
              <div className="text-right">
                <span className={`font-extrabold ${data.summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatPrice(data.summary.netProfit)}
                </span>
                <span className="ml-2 text-xs text-white/50">({data.summary.netMarginPct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown by source */}
      {data && !loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(["customer", "reseller", "pos"] as const).map((s) => (
            <div key={s} className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
              <span className={`badge ${sourceBadge[s]}`}>{sourceLabel[s]}</span>
              <p className="mt-3 text-lg font-bold text-navy-800">{formatPrice(data.bySource[s].profit)}</p>
              <p className="text-xs text-navy-800/50">
                profit · {formatPrice(data.bySource[s].revenue)} revenue − {formatPrice(data.bySource[s].cost)} cost
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Trend */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Revenue vs Cost Trend</h2>
        <p className="text-sm text-navy-800/50">Daily revenue and cost for the selected range.</p>
        {loading ? (
          <p className="mt-8 text-navy-800/50">Loading…</p>
        ) : !data || data.trend.length === 0 ? (
          <p className="mt-8 text-navy-800/50">No sales in this range.</p>
        ) : (
          <TrendChart trend={data.trend} max={maxTrend} />
        )}
      </div>

      {/* Product breakdown */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Profit by Product</h2>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Units Sold</th>
              <th className="px-6 py-3">Revenue</th>
              <th className="px-6 py-3">Cost</th>
              <th className="px-6 py-3">Profit</th>
              <th className="px-6 py-3">Margin</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : !data || data.productTable.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No sales in this range.</td></tr>
            ) : (
              <>
                {data.productTable.map((p) => (
                  <tr key={p.slug} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-3 font-medium text-navy-800">{p.name}</td>
                    <td className="px-6 py-3 text-navy-800/70">{p.units}</td>
                    <td className="px-6 py-3 text-navy-800/70">{formatPrice(p.revenue)}</td>
                    <td className="px-6 py-3 text-navy-800/70">{formatPrice(p.cost)}</td>
                    <td className={`px-6 py-3 font-semibold ${p.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPrice(p.profit)}</td>
                    <td className="px-6 py-3 text-navy-800/70">{p.marginPct.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-navy-50/50 font-bold text-navy-800">
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3">{data.productTable.reduce((s, p) => s + p.units, 0)}</td>
                  <td className="px-6 py-3">{formatPrice(data.summary.totalRevenue)}</td>
                  <td className="px-6 py-3">{formatPrice(data.summary.totalCost)}</td>
                  <td className={data.summary.grossProfit >= 0 ? "px-6 py-3 text-emerald-600" : "px-6 py-3 text-red-600"}>{formatPrice(data.summary.grossProfit)}</td>
                  <td className="px-6 py-3">{data.summary.grossMarginPct.toFixed(1)}%</td>
                </tr>
              </>
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
  const revenuePoints = trend.map((t, i) => ({ x: pad + i * xStep, y: h - pad - (t.revenue / max) * (h - pad * 2), t }));
  const costPoints = trend.map((t, i) => ({ x: pad + i * xStep, y: h - pad - (t.cost / max) * (h - pad * 2), t }));
  const linePath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="mb-2 flex items-center gap-4 text-xs text-navy-800/60">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f5851f]" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0f2540]" />Cost</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ maxHeight: 260 }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - pad * 2)} y2={h - pad - f * (h - pad * 2)} stroke="#0f254010" />
        ))}
        <path d={linePath(revenuePoints)} fill="none" stroke="#f5851f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={linePath(costPoints)} fill="none" stroke="#0f2540" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {revenuePoints.map((p, i) => (
          <circle key={`r${i}`} cx={p.x} cy={p.y} r="3" fill="#f5851f">
            <title>{`${p.t.date} · Revenue: ${formatPrice(p.t.revenue)}`}</title>
          </circle>
        ))}
        {costPoints.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r="3" fill="#0f2540">
            <title>{`${p.t.date} · Cost: ${formatPrice(p.t.cost)}`}</title>
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

const toneBg: Record<string, string> = { blue: "bg-blue-50", amber: "bg-amber-50", green: "bg-emerald-50", purple: "bg-purple-50", red: "bg-red-50" };
const toneText: Record<string, string> = { blue: "text-blue-500", amber: "text-amber-500", green: "text-emerald-500", purple: "text-purple-500", red: "text-red-500" };

function StatIcon({ name, className }: { name: string; className?: string }) {
  const c = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  if (name === "dollar") return <svg {...c}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (name === "trend") return <svg {...c}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
  if (name === "profit") return <svg {...c}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" /></svg>;
  if (name === "box") return <svg {...c}><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><polyline points="3.3 7 12 12 20.7 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>;
  return <svg {...c}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
}
