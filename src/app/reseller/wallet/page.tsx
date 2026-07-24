"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";

interface Txn {
  type: "credit" | "debit";
  ref: string;
  label: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function WalletPage() {
  const [data, setData] = useState<{
    balance: number;
    pendingWithdrawals: number;
    lifetimeEarnings: number;
    transactions: Txn[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reseller/wallet", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">My Wallet</h1>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl bg-navy-800 p-6 text-white shadow-sm">
          <p className="text-sm text-white/60">Available Balance</p>
          <p className="mt-2 text-3xl font-extrabold">
            {loading ? "…" : formatPrice(data?.balance ?? 0)}
          </p>
          <Link href="/reseller/withdrawals/new" className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Withdraw funds
          </Link>
        </div>
        <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
          <p className="text-sm text-navy-800/50">Lifetime Earnings</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {loading ? "…" : formatPrice(data?.lifetimeEarnings ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
          <p className="text-sm text-navy-800/50">Pending Withdrawals</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {loading ? "…" : formatPrice(data?.pendingWithdrawals ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <div className="border-b border-navy-800/10 px-6 py-4">
          <h2 className="font-bold text-navy-800">Transaction History</h2>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-3">Reference</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : !data || data.transactions.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No transactions yet.</td></tr>
            ) : (
              data.transactions.map((t) => (
                <tr key={t.ref + t.type} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3 font-medium text-navy-800">{t.ref}</td>
                  <td className="px-6 py-3 text-navy-800/70">{t.label}</td>
                  <td className="px-6 py-3 text-navy-800/60">{new Date(t.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-3"><ResellerStatusBadge status={t.status} /></td>
                  <td className={`px-6 py-3 text-right font-semibold ${t.type === "credit" ? "text-emerald-600" : "text-navy-800"}`}>
                    {t.type === "credit" ? "+" : "−"}{formatPrice(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
