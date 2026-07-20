"use client";

import { useEffect, useState } from "react";

export default function BankDetailsPage() {
  const [bank, setBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/reseller/bank", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.bank) setBank(d.bank);
      })
      .finally(() => setLoaded(true));
  }, []);

  const set = (k: keyof typeof bank) => (v: string) => setBank((b) => ({ ...b, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/reseller/bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bank),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      setMsg({ type: "ok", text: "Bank details saved." });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-navy-800">Bank Details</h1>
      <p className="mt-1 text-sm text-navy-800/50">
        Your withdrawals will be transferred to this account.
      </p>

      <form onSubmit={save} className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank Name">
            <input value={bank.bankName} onChange={(e) => set("bankName")(e.target.value)} disabled={!loaded} className="input" placeholder="e.g. Commercial Bank" />
          </Field>
          <Field label="Account Holder Name">
            <input value={bank.accountName} onChange={(e) => set("accountName")(e.target.value)} disabled={!loaded} className="input" placeholder="Full name on account" />
          </Field>
          <Field label="Account Number">
            <input value={bank.accountNumber} onChange={(e) => set("accountNumber")(e.target.value)} disabled={!loaded} className="input" placeholder="Account number" />
          </Field>
          <Field label="Branch">
            <input value={bank.branch} onChange={(e) => set("branch")(e.target.value)} disabled={!loaded} className="input" placeholder="Branch name" />
          </Field>
        </div>

        {msg && (
          <p className={`mt-4 rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {msg.text}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Bank Details"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>
      {children}
    </div>
  );
}
