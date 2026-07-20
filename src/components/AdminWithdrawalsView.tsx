"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import ResellerStatusBadge from "@/components/ResellerStatusBadge";
import { useToast } from "@/context/ToastProvider";

interface Withdrawal {
  withdrawRef: string;
  resellerName: string;
  amount: number;
  status: string;
  bank: string;
  createdAt: string;
}

export default function AdminWithdrawalsView({ mode }: { mode: "pending" | "history" }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  const load = () => {
    fetch("/api/admin/withdrawals", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.withdrawals ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(
    () => rows.filter((w) => (mode === "pending" ? w.status === "pending" : w.status !== "pending")),
    [rows, mode]
  );

  const setStatus = async (ref: string, status: string) => {
    setSaving(ref);
    setRows((prev) => prev.map((w) => (w.withdrawRef === ref ? { ...w, status } : w)));
    try {
      await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawRef: ref, status }),
      });
      toast(status === "completed" ? "Withdrawal approved" : "Withdrawal rejected");
    } finally {
      setSaving("");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">
        {mode === "pending" ? "Pending Withdrawals" : "Withdraw History"}
      </h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Reseller</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Bank</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              {mode === "pending" && <th className="px-6 py-4">Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No withdrawals found</td></tr>
            ) : (
              filtered.map((w) => (
                <tr key={w.withdrawRef} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4 font-semibold text-brand">{w.withdrawRef}</td>
                  <td className="px-6 py-4 text-navy-800">{w.resellerName}</td>
                  <td className="px-6 py-4 font-bold text-navy-800">{formatPrice(w.amount)}</td>
                  <td className="px-6 py-4 text-navy-800/60">{w.bank || "—"}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(w.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4"><ResellerStatusBadge status={w.status} /></td>
                  {mode === "pending" && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button disabled={saving === w.withdrawRef} onClick={() => setStatus(w.withdrawRef, "completed")} className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">Approve</button>
                        <button disabled={saving === w.withdrawRef} onClick={() => setStatus(w.withdrawRef, "rejected")} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200">Reject</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
