"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import PasswordInput from "@/components/PasswordInput";

type Msg = { type: "ok" | "err"; text: string } | null;

export default function AccountSettings({ showSystemControls = false }: { showSystemControls?: boolean }) {
  const { refresh } = useAuth();
  const [account, setAccount] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [loaded, setLoaded] = useState(false);
  const [accountMsg, setAccountMsg] = useState<Msg>(null);
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [systemLoaded, setSystemLoaded] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [systemMsg, setSystemMsg] = useState<Msg>(null);

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

  useEffect(() => {
    if (!showSystemControls) return;
    fetch("/api/admin/settings/system", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load system settings");
        setMaintenance(data.maintenance === true);
      })
      .catch((error) => setSystemMsg({ type: "err", text: error instanceof Error ? error.message : "Unable to load system settings" }))
      .finally(() => setSystemLoaded(true));
  }, [showSystemControls]);

  const toggleMaintenance = async () => {
    const nextValue = !maintenance;
    setSavingMaintenance(true);
    setSystemMsg(null);
    try {
      const response = await fetch("/api/admin/settings/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: nextValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update maintenance mode");
      setMaintenance(data.maintenance);
      setSystemMsg({ type: "ok", text: `Maintenance mode ${data.maintenance ? "enabled" : "disabled"}.` });
    } catch (error) {
      setSystemMsg({ type: "err", text: error instanceof Error ? error.message : "Unable to update maintenance mode" });
    } finally {
      setSavingMaintenance(false);
    }
  };

  const clearCache = async () => {
    setClearingCache(true);
    setSystemMsg(null);
    try {
      const response = await fetch("/api/admin/settings/system", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to clear cache");
      setSystemMsg({ type: "ok", text: "Application cache cleared successfully." });
    } catch (error) {
      setSystemMsg({ type: "err", text: error instanceof Error ? error.message : "Unable to clear cache" });
    } finally {
      setClearingCache(false);
    }
  };

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

      {showSystemControls && (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
          <div className={`pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full blur-3xl transition-colors duration-700 ${maintenance ? "bg-amber-300/20" : "bg-emerald-300/20"}`} />
          <div className="relative">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-500 ${maintenance ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-5 w-5 ${savingMaintenance ? "animate-spin" : ""}`}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42M7.06 16.94l-1.42 1.42"/><circle cx="12" cy="12" r="4"/></svg>
              </div>
              <div>
                <h2 className="font-bold text-navy-800">System Controls</h2>
                <p className="mt-1 text-sm text-navy-800/55">Manage storefront availability and refresh cached content.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className={`rounded-2xl border p-5 transition-all duration-500 ${maintenance ? "border-amber-300 bg-amber-50/70 shadow-sm shadow-amber-100" : "border-emerald-200 bg-emerald-50/40"}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-navy-800">Maintenance Mode</p>
                    <p className={`mt-1 text-xs font-semibold ${maintenance ? "text-amber-700" : "text-emerald-700"}`}>
                      {maintenance ? "Storefront is offline" : "Storefront is live"}
                    </p>
                  </div>
                  <button type="button" role="switch" aria-checked={maintenance} aria-label="Toggle maintenance mode" onClick={toggleMaintenance} disabled={!systemLoaded || savingMaintenance} className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition-all duration-300 focus:outline-none focus:ring-4 disabled:cursor-wait disabled:opacity-60 ${maintenance ? "bg-amber-500 focus:ring-amber-200" : "bg-emerald-500 focus:ring-emerald-200"}`}>
                    <span className={`block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${maintenance ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
                <p className="mt-4 text-xs leading-5 text-navy-800/55">When enabled, visitors see a maintenance notice. Admin access and sign-in stay available.</p>
              </div>

              <div className="rounded-2xl border border-navy-100 bg-navy-50/30 p-5">
                <p className="font-semibold text-navy-800">Application Cache</p>
                <p className="mt-1 text-xs leading-5 text-navy-800/55">Refresh cached pages and server-rendered content across the website.</p>
                <button type="button" onClick={clearCache} disabled={clearingCache || !systemLoaded} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:border-navy-300 hover:shadow disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60">
                  <svg className={`h-4 w-4 ${clearingCache ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6"/></svg>
                  {clearingCache ? "Clearing…" : "Clear Cache"}
                </button>
              </div>
            </div>
            {systemMsg && <div className="mt-4"><Banner msg={systemMsg} /></div>}
          </div>
        </section>
      )}

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
