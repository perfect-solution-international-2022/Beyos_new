"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";

interface ResellerDetail {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string | null;
  resellerStatus: string;
  allowPriceOverride: boolean;
  minMarkupPct: number;
  maxMarkupPct: number | null;
  creditLimit: number;
  bank: { bankName: string; accountName: string; accountNumber: string; branch: string };
  createdAt: string;
}

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  walletBalance: number;
  pendingWithdrawals: number;
}

interface OrderRow {
  orderRef: string;
  customerName: string;
  amount: number;
  profit: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface WithdrawalRow {
  withdrawRef: string;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
}

interface TransactionRow {
  type: "credit" | "debit" | "reversal";
  ref: string;
  description: string;
  amount: number;
  createdAt: string;
}

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  unpaid: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
};

const withdrawBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ResellerDetailView({ resellerId }: { resellerId: string }) {
  const [reseller, setReseller] = useState<ResellerDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/resellers/${resellerId}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load reseller");
        setReseller(d.reseller);
        setStats(d.stats);
        setOrders(d.orders);
        setWithdrawals(d.withdrawals);
        setTransactions(d.transactions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load reseller"))
      .finally(() => setLoading(false));
  }, [resellerId]);

  if (loading) return <div className="mt-10 text-center text-navy-800/50">Loading…</div>;
  if (error || !reseller || !stats) {
    return <div className="mt-10 text-center text-red-600">{error || "Reseller not found"}</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">Reseller</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-800">{reseller.name}</h1>
        </div>
        <span
          className={`badge capitalize ${
            reseller.resellerStatus === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : reseller.resellerStatus === "rejected" || reseller.resellerStatus === "suspended"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {reseller.resellerStatus}
        </span>
      </div>

      {/* Stat tiles */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Wallet Balance" value={formatPrice(stats.walletBalance)} />
        <StatTile label="Total Sales" value={formatPrice(stats.totalSales)} />
        <StatTile label="Orders" value={String(stats.totalOrders)} sub={`${stats.pendingOrders} pending`} />
        <StatTile label="Pending Withdrawals" value={formatPrice(stats.pendingWithdrawals)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Orders */}
          <div id="orders" className="rounded-2xl border border-navy-800/5 bg-white shadow-sm scroll-mt-24">
            <div className="px-6 pt-6"><h2 className="font-bold text-navy-800">Recent Orders</h2></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-800/10 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Payment</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No orders yet</td></tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.orderRef} className="border-b border-navy-800/5 last:border-0">
                        <td className="px-6 py-3 font-semibold text-brand">#{o.orderRef}</td>
                        <td className="px-6 py-3 text-navy-800">{o.customerName}</td>
                        <td className="px-6 py-3"><ResellerStatusBadge status={o.status} /></td>
                        <td className="px-6 py-3">
                          <span className={`badge capitalize ${paymentBadge[o.paymentStatus] ?? "bg-navy-50 text-navy-800"}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-navy-800">{formatPrice(o.amount)}</td>
                        <td className="px-6 py-3 text-right text-emerald-700">{formatPrice(o.profit)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Withdrawals */}
          <div className="rounded-2xl border border-navy-800/5 bg-white shadow-sm">
            <div className="px-6 pt-6"><h2 className="font-bold text-navy-800">Withdrawal History</h2></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-800/10 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No withdrawals yet</td></tr>
                  ) : (
                    withdrawals.map((w) => (
                      <tr key={w.withdrawRef} className="border-b border-navy-800/5 last:border-0">
                        <td className="px-6 py-3 font-mono text-xs font-semibold text-navy-800">{w.withdrawRef}</td>
                        <td className="px-6 py-3">
                          <span className={`badge capitalize ${withdrawBadge[w.status] ?? "bg-navy-50 text-navy-800"}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-navy-800/60">{new Date(w.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className="px-6 py-3 text-right font-semibold text-navy-800">{formatPrice(w.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Wallet ledger */}
          <div className="rounded-2xl border border-navy-800/5 bg-white shadow-sm">
            <div className="px-6 pt-6"><h2 className="font-bold text-navy-800">Wallet Transactions</h2></div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-800/10 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Reference</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No transactions yet</td></tr>
                  ) : (
                    transactions.map((t, i) => (
                      <tr key={i} className="border-b border-navy-800/5 last:border-0">
                        <td className="px-6 py-3 text-navy-800">{t.description}</td>
                        <td className="px-6 py-3 font-mono text-xs text-navy-800/55">{t.ref}</td>
                        <td className="px-6 py-3 text-navy-800/60">{new Date(t.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className={`px-6 py-3 text-right font-semibold ${t.type === "credit" ? "text-emerald-700" : "text-red-600"}`}>
                          {t.type === "credit" ? "+" : "-"}{formatPrice(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Contact</h2>
            <div className="mt-3 space-y-1.5 text-sm text-navy-800/70">
              <p><span className="text-navy-800/50">Email:</span> {reseller.email}</p>
              <p><span className="text-navy-800/50">Phone:</span> {reseller.phone}</p>
              {reseller.city && <p><span className="text-navy-800/50">City:</span> {reseller.city}</p>}
              <p><span className="text-navy-800/50">Joined:</span> {new Date(reseller.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Pricing Rules</h2>
            <div className="mt-3 space-y-1.5 text-sm text-navy-800/70">
              <p><span className="text-navy-800/50">Custom price:</span> {reseller.allowPriceOverride ? "Allowed" : "Not allowed"}</p>
              <p><span className="text-navy-800/50">Min markup:</span> {reseller.minMarkupPct}%</p>
              <p><span className="text-navy-800/50">Max markup:</span> {reseller.maxMarkupPct == null ? "No limit" : `${reseller.maxMarkupPct}%`}</p>
              <p><span className="text-navy-800/50">Credit limit:</span> {reseller.creditLimit > 0 ? formatPrice(reseller.creditLimit) : "No limit"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Bank Details</h2>
            {reseller.bank.bankName ? (
              <div className="mt-3 space-y-1.5 text-sm text-navy-800/70">
                <p><span className="text-navy-800/50">Bank:</span> {reseller.bank.bankName}</p>
                <p><span className="text-navy-800/50">Account name:</span> {reseller.bank.accountName}</p>
                <p><span className="text-navy-800/50">Account number:</span> {reseller.bank.accountNumber}</p>
                {reseller.bank.branch && <p><span className="text-navy-800/50">Branch:</span> {reseller.bank.branch}</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-navy-800/50">No bank details on file</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-800/45">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-navy-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-navy-800/50">{sub}</p>}
    </div>
  );
}
