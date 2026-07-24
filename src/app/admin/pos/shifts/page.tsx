"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";

interface Shift {
  id: number;
  cashierName: string;
  openingFloat: number;
  closingFloat: number | null;
  expectedCash: number | null;
  cashDifference: number | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  saleCount: number;
  salesTotal: number;
}

export default function AdminPosShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ sales: any[] } | null>(null);

  useEffect(() => {
    fetch("/api/pos/shifts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setShifts(d.shifts ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (shift: Shift) => {
    if (expanded === shift.id) {
      setExpanded(null);
      return;
    }
    setExpanded(shift.id);
    setDetail(null);
    const res = await fetch(`/api/pos/shifts/${shift.id}`, { cache: "no-store" });
    const d = await res.json();
    setDetail(d);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Shift History</h1>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="py-10 text-center text-navy-800/50">Loading…</p>
        ) : shifts.length === 0 ? (
          <div className="rounded-2xl border border-navy-800/5 bg-white py-16 text-center text-navy-800/50 shadow-sm">
            No shifts recorded yet
          </div>
        ) : (
          shifts.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border border-navy-800/5 bg-white shadow-sm">
              <button
                onClick={() => toggleExpand(s)}
                className="flex w-full flex-wrap items-center justify-between gap-4 px-6 py-4 text-left hover:bg-navy-50/50"
              >
                <div>
                  <p className="text-sm font-bold text-navy-800">{s.cashierName}</p>
                  <p className="text-xs text-navy-800/50">
                    {new Date(s.openedAt).toLocaleString("en-GB")}
                    {s.closedAt && ` → ${new Date(s.closedAt).toLocaleString("en-GB")}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-navy-800/60">{s.saleCount} sale(s)</span>
                  <span className="text-sm font-bold text-navy-800">{formatPrice(s.salesTotal)}</span>
                  <span className={`badge ${s.status === "open" ? "bg-blue-100 text-blue-700" : "bg-navy-50 text-navy-800/60"}`}>
                    {s.status}
                  </span>
                </div>
              </button>
              {expanded === s.id && (
                <div className="border-t border-navy-800/10 px-6 py-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Stat label="Opening Float" value={formatPrice(s.openingFloat)} />
                    <Stat label="Expected Cash" value={s.expectedCash !== null ? formatPrice(s.expectedCash) : "—"} />
                    <Stat label="Closing Count" value={s.closingFloat !== null ? formatPrice(s.closingFloat) : "—"} />
                    <Stat
                      label="Difference"
                      value={s.cashDifference !== null ? formatPrice(s.cashDifference) : "—"}
                      tone={s.cashDifference === null ? undefined : s.cashDifference === 0 ? "ok" : s.cashDifference > 0 ? "over" : "short"}
                    />
                  </div>
                  {detail?.sales && (
                    <ul className="mt-4 divide-y divide-navy-800/5">
                      {detail.sales.length === 0 ? (
                        <li className="py-3 text-sm text-navy-800/50">No sales in this shift.</li>
                      ) : (
                        detail.sales.map((sale: any) => (
                          <li key={sale.receiptNumber} className="flex justify-between py-2.5 text-sm">
                            <span className="font-mono text-navy-800/70">{sale.receiptNumber}</span>
                            <span className="text-navy-800/60">{sale.customerName || "Walk-in"}</span>
                            <span className="font-semibold text-navy-800">{formatPrice(sale.total)}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "over" | "short" }) {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "over" ? "text-blue-600" : tone === "short" ? "text-red-600" : "text-navy-800";
  return (
    <div className="rounded-xl bg-navy-50 p-3">
      <p className="text-xs text-navy-800/50">{label}</p>
      <p className={`mt-1 font-bold ${cls}`}>{value}</p>
    </div>
  );
}
