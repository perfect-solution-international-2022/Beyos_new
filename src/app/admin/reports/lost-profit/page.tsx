"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Row {
  source: "customer" | "reseller" | "pos";
  orderRef: string;
  reason: string;
  customerName: string;
  lostRevenue: number;
  lostProfit: number;
  cancelledDate: string;
}
interface SourceBreakdown { count: number; lostRevenue: number; lostProfit: number; }
interface TrendPoint { date: string; lostProfit: number; }
interface ReportData {
  range: { start: string; end: string };
  summary: { totalLostRevenue: number; totalLostProfit: number; totalCancelled: number };
  bySource: { customer: SourceBreakdown; reseller: SourceBreakdown; pos: SourceBreakdown };
  trend: TrendPoint[];
  rows: Row[];
}

const sourceLabel: Record<Row["source"], string> = { customer: "Customer", reseller: "Reseller", pos: "POS" };
const sourceBadge: Record<Row["source"], string> = {
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

export default function LostProfitReportPage() {
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(toISODate(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = (s: string, e: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/reports/lost-profit?start=${s}&end=${e}`, { cache: "no-store" })
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
      ["Source", "Order Ref", "Customer", "Reason", "Date", "Lost Revenue", "Lost Profit"],
      ...data.rows.map((r) => [
        sourceLabel[r.source], r.orderRef, r.customerName, r.reason, r.cancelledDate,
        r.lostRevenue.toFixed(2), r.lostProfit.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beyos-lost-profit-report-${data.range.start}_to_${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map((t) => t.lostProfit) ?? [1])), [data]);

  const cards = data
    ? [
        { label: "Lost Profit", value: formatPrice(data.summary.totalLostProfit), icon: "profit", tone: "amber" },
        { label: "Lost Revenue", value: formatPrice(data.summary.totalLostRevenue), icon: "dollar", tone: "purple" },
        { label: "Cancelled/Rejected Orders", value: String(data.summary.totalCancelled), icon: "cart", tone: "blue" },
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Lost Profit Report</h1>
          <p className="mt-1 text-sm text-navy-800/50">Profit forfeited to cancelled, rejected, or reverted orders.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!data || data.rows.length === 0}
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
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(loading ? Array.from({ length: 3 }) : cards).map((c: any, i) => (
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

      {/* Breakdown by source */}
      {data && !loading && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(["customer", "reseller", "pos"] as const).map((s) => (
            <div key={s} className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={`badge ${sourceBadge[s]}`}>{sourceLabel[s]}</span>
                <span className="text-xs text-navy-800/45">{data.bySource[s].count} order{data.bySource[s].count === 1 ? "" : "s"}</span>
              </div>
              <p className="mt-3 text-lg font-bold text-navy-800">{formatPrice(data.bySource[s].lostProfit)}</p>
              <p className="text-xs text-navy-800/50">lost profit · {formatPrice(data.bySource[s].lostRevenue)} lost revenue</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Lost Profit Trend</h2>
        <p className="text-sm text-navy-800/50">Daily profit lost to cancellations for the selected range.</p>
        {loading ? (
          <p className="mt-8 text-navy-800/50">Loading…</p>
        ) : !data || data.trend.length === 0 ? (
          <p className="mt-8 text-navy-800/50">No cancellations in this range. 🎉</p>
        ) : (
          <TrendChart trend={data.trend} max={maxTrend} />
        )}
      </div>

      {/* Detail table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Cancelled &amp; Rejected Orders</h2>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Order Ref</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Lost Revenue</th>
              <th className="px-6 py-3">Lost Profit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : !data || data.rows.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No cancellations in this range. 🎉</td></tr>
            ) : (
              data.rows.map((r) => (
                <tr key={`${r.source}-${r.orderRef}`} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3"><span className={`badge ${sourceBadge[r.source]}`}>{sourceLabel[r.source]}</span></td>
                  <td className="px-6 py-3 font-semibold text-brand">#{r.orderRef}</td>
                  <td className="px-6 py-3 text-navy-800">{r.customerName}</td>
                  <td className="px-6 py-3 text-navy-800/70">{r.reason}</td>
                  <td className="px-6 py-3 text-navy-800/60">{new Date(r.cancelledDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-3 text-navy-800/70">{formatPrice(r.lostRevenue)}</td>
                  <td className="px-6 py-3 font-semibold text-red-600">-{formatPrice(r.lostProfit)}</td>
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
    const y = h - pad - (t.lostProfit / max) * (h - pad * 2);
    return { x, y, t };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`;

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ maxHeight: 260 }}>
        <defs>
          <linearGradient id="lostProfitFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - pad * 2)} y2={h - pad - f * (h - pad * 2)} stroke="#0f254010" />
        ))}
        <path d={areaPath} fill="url(#lostProfitFill)" />
        <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ef4444">
            <title>{`${p.t.date}: ${formatPrice(p.t.lostProfit)}`}</title>
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

const toneBg: Record<string, string> = { blue: "bg-blue-50", amber: "bg-amber-50", green: "bg-emerald-50", purple: "bg-purple-50" };
const toneText: Record<string, string> = { blue: "text-blue-500", amber: "text-amber-500", green: "text-emerald-500", purple: "text-purple-500" };

function StatIcon({ name, className }: { name: string; className?: string }) {
  const c = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };
  if (name === "dollar") return <svg {...c}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
  if (name === "profit") return <svg {...c}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" /></svg>;
  return <svg {...c}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>;
}
