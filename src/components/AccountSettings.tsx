"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import PasswordInput from "@/components/PasswordInput";

type Msg = { type: "ok" | "err"; text: string } | null;

export default function AccountSettings() {
  const { refresh } = useAuth();
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [loaded, setLoaded] = useState(false);
  const [accountMsg, setAccountMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile)
          setAccount({
            firstName: d.profile.firstName,
            lastName: d.profile.lastName,
            email: d.profile.email,
            phone: d.profile.phone,
          });
      })
      .finally(() => setLoaded(true));
  }, []);

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountMsg(null);
    setSavingAccount(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: account.firstName, lastName: account.lastName, phone: account.phone }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      await refresh();
      setAccountMsg({ type: "ok", text: "Account details updated." });
    } catch (err) {
      setAccountMsg({ type: "err", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setSavingAccount(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "ok", text: "Password updated successfully." });
    } catch (err) {
      setPwMsg({ type: "err", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-navy-800">Settings</h1>

      <section className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-bold text-navy-800">Account Information</h2>
        <form onSubmit={saveAccount} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="First Name" value={account.firstName} onChange={(v) => setAccount((a) => ({ ...a, firstName: v }))} disabled={!loaded} required />
            <Labeled label="Last Name" value={account.lastName} onChange={(v) => setAccount((a) => ({ ...a, lastName: v }))} disabled={!loaded} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Email Address</label>
              <input value={account.email} disabled className="input cursor-not-allowed bg-navy-50/60 text-navy-800/60" />
            </div>
            <Labeled label="Phone Number" value={account.phone} onChange={(v) => setAccount((a) => ({ ...a, phone: v }))} disabled={!loaded} />
          </div>
          {accountMsg && <Banner msg={accountMsg} />}
          <div className="flex justify-end">
            <button type="submit" disabled={savingAccount} className="btn-primary">
              {savingAccount ? "Saving…" : "Update"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-bold text-navy-800">Security Information</h2>
        <form onSubmit={savePassword} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Username</label>
              <input value={account.email} disabled className="input cursor-not-allowed bg-navy-50/60 text-navy-800/60" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Current Password</label>
              <PasswordInput value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} placeholder="Enter current password" autoComplete="current-password" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">New Password</label>
              <PasswordInput value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} placeholder="Enter new password" autoComplete="new-password" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Confirm Password</label>
              <PasswordInput value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} placeholder="Confirm new password" autoComplete="new-password" />
            </div>
          </div>
          {pwMsg && <Banner msg={pwMsg} />}
          <div className="flex justify-end">
            <button type="submit" disabled={savingPw} className="btn-primary">
              {savingPw ? "Saving…" : "Update"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Banner({ msg }: { msg: NonNullable<Msg> }) {
  return (
    <p className={`rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {msg.text}
    </p>
  );
}

function Labeled({
  label, value, onChange, disabled, required,
}: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={required} className="input" />
    </div>
  );
}
