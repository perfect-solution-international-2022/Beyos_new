"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";

type LeakKey = "price_concessions" | "manual_discounts" | "delivery_subsidy" | "stock_write_offs" | "cancellations";

interface LeakRow { reference: string; label: string; detail: string; date: string; amount: number; channel: string; units: number; }
interface Bucket {
  key: LeakKey; label: string; description: string; action: string; tone: string;
  amount: number; count: number; sharePct: number; top: LeakRow[];
}
interface ReportData {
  range: { start: string; end: string };
  summary: { totalLost: number; earnedProfit: number; potentialProfit: number; lostSharePct: number; biggestLeak: string | null };
  buckets: Bucket[];
  trend: { date: string; amount: number }[];
  topProducts: { slug: string; name: string; amount: number; units: number }[];
  byChannel: { channel: string; amount: number }[];
}

const tone: Record<string, { bar: string; dot: string; text: string; soft: string; ring: string }> = {
  amber: { bar: "bg-amber-400", dot: "bg-amber-400", text: "text-amber-600", soft: "bg-amber-50", ring: "ring-amber-100" },
  purple: { bar: "bg-purple-400", dot: "bg-purple-400", text: "text-purple-600", soft: "bg-purple-50", ring: "ring-purple-100" },
  blue: { bar: "bg-sky-400", dot: "bg-sky-400", text: "text-sky-600", soft: "bg-sky-50", ring: "ring-sky-100" },
  red: { bar: "bg-red-400", dot: "bg-red-400", text: "text-red-600", soft: "bg-red-50", ring: "ring-red-100" },
  slate: { bar: "bg-slate-400", dot: "bg-slate-400", text: "text-slate-600", soft: "bg-slate-50", ring: "ring-slate-100" },
};
const channelLabel: Record<string, string> = { pos: "POS", website: "Website", reseller: "Reseller", stock: "Inventory" };

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISODate(d); }

export default function LostProfitReportPage() {
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(toISODate(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openBucket, setOpenBucket] = useState<LeakKey | null>(null);

  const load = (s: string, e: string) => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/reports/lost-profit?start=${s}&end=${e}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load report");
        setData(d);
        setOpenBucket(d.buckets.find((b: Bucket) => b.amount > 0)?.key ?? null);
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
    const rows: string[][] = [
      ["Lost Profit Report", `${data.range.start} to ${data.range.end}`],
      [],
      ["Profit earned", data.summary.earnedProfit.toFixed(2)],
      ["Profit lost", data.summary.totalLost.toFixed(2)],
      ["Profit possible", data.summary.potentialProfit.toFixed(2)],
      ["Lost share %", data.summary.lostSharePct.toFixed(1)],
      [],
      ["Leak", "Amount", "Entries", "Share %"],
      ...data.buckets.map((b) => [b.label, b.amount.toFixed(2), String(b.count), b.sharePct.toFixed(1)]),
      [],
      ["Product", "Units", "Lost"],
      ...data.topProducts.map((p) => [p.name, String(p.units), p.amount.toFixed(2)]),
      [],
      ["Leak", "Reference", "Item", "Detail", "Date", "Amount"],
      ...data.buckets.flatMap((b) => b.top.map((t) => [b.label, t.reference, t.label, t.detail, t.date, t.amount.toFixed(2)])),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beyos-lost-profit-${data.range.start}_to_${data.range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map((t) => t.amount) ?? [1])), [data]);
  const activeBuckets = data?.buckets.filter((b) => b.amount > 0) ?? [];
  const openDetail = data?.buckets.find((b) => b.key === openBucket) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Lost Profit Report</h1>
          <p className="mt-1 text-sm text-navy-800/50">
            Every way profit leaked out this period — price concessions, discounts, delivery subsidy, write-offs and cancellations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/reports/profit-loss" className="btn-outline flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Profit &amp; Loss
          </Link>
          <button onClick={exportCsv} disabled={!data} className="btn-outline flex items-center gap-2 disabled:opacity-40">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Date range */}
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

      {/* Hero */}
      <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 p-6 text-white shadow-lg sm:p-8">
        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : !data ? null : (
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-[240px]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Profit lost this period</p>
              <p className="mt-2 text-4xl font-extrabold tabular-nums tracking-tight text-[#ff9b52] sm:text-5xl">
                {formatPrice(data.summary.totalLost)}
              </p>
              <p className="mt-2 text-sm text-white/60">
                {data.summary.lostSharePct.toFixed(1)}% of the {formatPrice(data.summary.potentialProfit)} you could have made
                {data.summary.biggestLeak && <> · mostly <span className="font-semibold text-white/85">{data.summary.biggestLeak}</span></>}
              </p>
            </div>
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-end justify-between text-xs text-white/55">
                <span>Kept <span className="font-bold text-emerald-300">{formatPrice(data.summary.earnedProfit)}</span></span>
                <span>Lost <span className="font-bold text-[#ff9b52]">{formatPrice(data.summary.totalLost)}</span></span>
              </div>
              <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bg-emerald-400/90 transition-all duration-700"
                  style={{ width: `${Math.max(0, 100 - data.summary.lostSharePct)}%` }}
                />
                <div className="bg-[#ff8426] transition-all duration-700" style={{ width: `${data.summary.lostSharePct}%` }} />
              </div>
              {/* Composition of the loss */}
              <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-white/10">
                {activeBuckets.map((b) => (
                  <div key={b.key} className={tone[b.tone].bar} style={{ width: `${b.sharePct}%` }} title={`${b.label} · ${formatPrice(b.amount)}`} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/60">
                {activeBuckets.map((b) => (
                  <span key={b.key} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${tone[b.tone].dot}`} />
                    {b.label} {b.sharePct.toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leak buckets */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 5 }) : data?.buckets ?? []).map((b: any, i) => {
          if (loading) return <div key={i} className="h-40 animate-pulse rounded-2xl border border-navy-800/5 bg-white shadow-sm" />;
          const t = tone[b.tone];
          const muted = b.amount === 0;
          return (
            <button
              key={b.key}
              onClick={() => setOpenBucket(b.key)}
              className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
                openBucket === b.key ? `border-transparent ring-2 ${t.ring}` : "border-navy-800/5"
              } ${muted ? "opacity-55" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full ${t.soft} px-2.5 py-1 text-[11px] font-semibold ${t.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                  {b.label}
                </span>
                <span className="text-[11px] font-medium tabular-nums text-navy-800/40">{b.sharePct.toFixed(0)}%</span>
              </div>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-navy-800">{formatPrice(b.amount)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-50">
                <div className={`h-full ${t.bar} transition-all duration-700`} style={{ width: `${b.sharePct}%` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-navy-800/55">{b.description}</p>
              <p className="mt-2 text-[11px] text-navy-800/35">{b.count} {b.count === 1 ? "entry" : "entries"}</p>
            </button>
          );
        })}

        {/* Channel split */}
        {!loading && data && (
          <div className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">Where it leaked</p>
            <div className="mt-4 space-y-3">
              {data.byChannel.length === 0 && <p className="text-sm text-navy-800/40">Nothing in this range.</p>}
              {data.byChannel.map((c) => (
                <div key={c.channel}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-navy-800/70">{channelLabel[c.channel] ?? c.channel}</span>
                    <span className="font-semibold tabular-nums text-navy-800">{formatPrice(c.amount)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-50">
                    <div
                      className="h-full bg-navy-800/70 transition-all duration-700"
                      style={{ width: `${data.summary.totalLost > 0 ? (c.amount / data.summary.totalLost) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trend */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-navy-800">Lost Profit Trend</h2>
        <p className="text-sm text-navy-800/50">Profit leaked per day across the selected range.</p>
        {loading ? (
          <p className="mt-8 text-navy-800/50">Loading…</p>
        ) : !data || data.trend.length === 0 ? (
          <p className="mt-8 text-navy-800/50">No losses recorded in this range.</p>
        ) : (
          <TrendChart trend={data.trend} max={maxTrend} />
        )}
      </div>

      {/* Bucket detail */}
      {!loading && openDetail && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-navy-800/5 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-navy-800/10 px-4 py-3">
            {(data?.buckets ?? []).map((b) => (
              <button
                key={b.key}
                onClick={() => setOpenBucket(b.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  openBucket === b.key ? `${tone[b.tone].soft} ${tone[b.tone].text}` : "text-navy-800/45 hover:text-navy-800"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="border-b border-navy-800/5 bg-navy-50/40 px-6 py-3">
            <p className="text-sm text-navy-800/70">{openDetail.description}</p>
            <p className="mt-1 text-xs text-navy-800/45">{openDetail.action}</p>
          </div>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                <th className="px-6 py-3">Item</th>
                <th className="px-6 py-3">Reference</th>
                <th className="px-6 py-3">Detail</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Lost</th>
              </tr>
            </thead>
            <tbody>
              {openDetail.top.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Nothing recorded for this leak — good.</td></tr>
              ) : (
                openDetail.top.map((t, i) => (
                  <tr key={`${t.reference}-${i}`} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-3 font-medium text-navy-800">{t.label}</td>
                    <td className="px-6 py-3 font-mono text-xs text-navy-800/50">{t.reference}</td>
                    <td className="px-6 py-3 text-navy-800/60">{t.detail}</td>
                    <td className="px-6 py-3 text-navy-800/50">{t.date}</td>
                    <td className={`px-6 py-3 text-right font-semibold tabular-nums ${tone[openDetail.tone].text}`}>
                      −{formatPrice(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {openDetail.count > openDetail.top.length && (
            <p className="border-t border-navy-800/5 px-6 py-3 text-xs text-navy-800/40">
              Showing the {openDetail.top.length} largest of {openDetail.count} entries — full list is in the CSV export.
            </p>
          )}
        </div>
      )}

      {/* Products */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Products Leaking The Most</h2>
          <p className="text-sm text-navy-800/50">Combines price concessions and stock write-offs per product.</p>
        </div>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-3">Product</th>
              <th className="px-6 py-3">Units</th>
              <th className="px-6 py-3 text-right">Lost</th>
              <th className="px-6 py-3">Share</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : !data || data.topProducts.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No product-level losses in this range.</td></tr>
            ) : (
              data.topProducts.map((p) => {
                const share = data.summary.totalLost > 0 ? (p.amount / data.summary.totalLost) * 100 : 0;
                return (
                  <tr key={p.slug} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-3 font-medium text-navy-800">{p.name}</td>
                    <td className="px-6 py-3 tabular-nums text-navy-800/60">{p.units}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-navy-800">{formatPrice(p.amount)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-navy-50">
                          <div className="h-full bg-brand-500" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-navy-800/45">{share.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ trend, max }: { trend: { date: string; amount: number }[]; max: number }) {
  const w = 800, h = 220, pad = 28;
  const n = trend.length;
  const xStep = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  const points = trend.map((t, i) => ({
    x: pad + i * xStep,
    y: h - pad - (t.amount / max) * (h - pad * 2),
    t,
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = n > 1 ? `${line} L${points[n - 1].x},${h - pad} L${points[0].x},${h - pad} Z` : "";

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[560px]" style={{ maxHeight: 260 }}>
        <defs>
          <linearGradient id="lostFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8426" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ff8426" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - pad * 2)} y2={h - pad - f * (h - pad * 2)} stroke="#10263d10" />
        ))}
        {area && <path d={area} fill="url(#lostFill)" />}
        <path d={line} fill="none" stroke="#ff8426" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#ff8426" strokeWidth="2">
            <title>{`${p.t.date} · ${formatPrice(p.t.amount)} lost`}</title>
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
