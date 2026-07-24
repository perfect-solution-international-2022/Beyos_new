"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

export default function CreateWithdrawPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/reseller/withdrawals", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBalance(d.balance ?? 0));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/reseller/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create withdrawal");
      setDone(true);
      setTimeout(() => router.push("/reseller/withdrawals/pending"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-navy-800">Create Withdrawal</h1>

      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="rounded-xl bg-navy-50 p-4">
          <p className="text-sm text-navy-800/60">Available Balance</p>
          <p className="mt-1 text-2xl font-bold text-navy-800">
            {balance === null ? "…" : formatPrice(balance)}
          </p>
        </div>

        {done ? (
          <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
            ✓ Withdrawal request submitted. Redirecting…
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Amount to withdraw
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="input"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
            <p className="text-xs text-navy-800/50">
              Minimum withdrawal: LKR 1,000. Only one request can be pending at a time.{" "}
              Funds are transferred to the bank account in your{" "}
              <Link href="/reseller/bank" className="font-medium text-brand hover:underline">
                Bank Details
              </Link>
              . Add them first if you haven&apos;t.
            </p>
            {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Submitting…" : "Request Withdrawal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
