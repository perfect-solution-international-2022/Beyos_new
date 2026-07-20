"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "./ResellerStatusBadge";

interface Withdrawal {
  withdrawRef: string;
  amount: number;
  status: string;
  bank: string;
  createdAt: string;
}

export default function WithdrawalsList({
  title,
  status,
}: {
  title: string;
  status?: string;
}) {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = status ? `?status=${status}` : "";
    fetch(`/api/reseller/withdrawals${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.withdrawals ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Bank</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No withdrawals found</td></tr>
            ) : (
              rows.map((w) => (
                <tr key={w.withdrawRef} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4 font-semibold text-brand">{w.withdrawRef}</td>
                  <td className="px-6 py-4 font-bold text-navy-800">{formatPrice(w.amount)}</td>
                  <td className="px-6 py-4 text-navy-800/60">{w.bank || "—"}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(w.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4"><ResellerStatusBadge status={w.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
