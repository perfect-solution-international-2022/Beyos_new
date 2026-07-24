"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/context/ToastProvider";
import { formatPrice } from "@/lib/utils";

interface Promotion {
  id: number;
  code: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  isActive: boolean;
  usedCount: number;
  imageUrl: string | null;
}

const blank = {
  id: 0,
  code: "",
  description: "",
  discountType: "percentage" as Promotion["discountType"],
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  usageLimitPerUser: "",
  isActive: true,
};
type Form = typeof blank;

function statusOf(p: Promotion): { label: string; cls: string } {
  if (!p.isActive) return { label: "Inactive", cls: "bg-navy-50 text-navy-800/60" };
  const now = new Date();
  if (p.endDate && now > new Date(p.endDate)) return { label: "Expired", cls: "bg-red-100 text-red-700" };
  if (p.startDate && now < new Date(p.startDate)) return { label: "Scheduled", cls: "bg-blue-100 text-blue-700" };
  if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return { label: "Limit reached", cls: "bg-amber-100 text-amber-700" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
}

function valueLabel(p: Promotion): string {
  if (p.discountType === "percentage") return `${p.discountValue}% off`;
  if (p.discountType === "fixed") return `${formatPrice(p.discountValue)} off`;
  return "Free shipping";
}

export default function AdminPromotionsPage() {
  const { toast, confirm } = useToast();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Form | null>(null);

  const load = () => {
    fetch("/api/admin/promotions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPromos(d.promotions ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("new")) setEditing({ ...blank }); }, []);

  const del = async (p: Promotion) => {
    const ok = await confirm({
      title: "Delete promo code?",
      message: `Delete “${p.code}”? It has been used ${p.usedCount} time(s). This cannot be undone.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setPromos((prev) => prev.filter((x) => x.id !== p.id));
    await fetch("/api/admin/promotions", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }),
    });
    toast(`Deleted “${p.code}”`);
  };

  const toggleActive = async (p: Promotion) => {
    setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch("/api/admin/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toFormPayload(p), isActive: !p.isActive }),
    });
  };

  const openEdit = (p: Promotion) => {
    setEditing({
      id: p.id,
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountType === "free_shipping" ? "" : String(p.discountValue),
      minOrderAmount: p.minOrderAmount !== null ? String(p.minOrderAmount) : "",
      maxDiscountAmount: p.maxDiscountAmount !== null ? String(p.maxDiscountAmount) : "",
      startDate: p.startDate ? p.startDate.slice(0, 10) : "",
      endDate: p.endDate ? p.endDate.slice(0, 10) : "",
      usageLimit: p.usageLimit !== null ? String(p.usageLimit) : "",
      usageLimitPerUser: p.usageLimitPerUser !== null ? String(p.usageLimitPerUser) : "",
      isActive: p.isActive,
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Promotions</h1>
        <div className="flex gap-2">
          <Link href="/promotions" target="_blank" className="btn-outline">
            View Promotions Page
          </Link>
          <button onClick={() => setEditing({ ...blank })} className="btn-primary">+ Add Promo Code</button>
        </div>
      </div>
      <p className="mt-1 text-sm text-navy-800/50">
        Discount codes buyers can apply at checkout. Active codes with an image show up on the public Promotions page.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4">Min Order</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No promo codes yet</td></tr>
            ) : (
              promos.map((p) => {
                const s = statusOf(p);
                return (
                  <tr key={p.id} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-3">
                      <PromoImageCell promo={p} onChanged={load} />
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-mono font-semibold text-navy-800">{p.code}</div>
                      {p.description && <div className="text-xs text-navy-800/50">{p.description}</div>}
                    </td>
                    <td className="px-6 py-3 text-navy-800/80">{valueLabel(p)}</td>
                    <td className="px-6 py-3 text-navy-800/60">{p.minOrderAmount ? formatPrice(p.minOrderAmount) : "—"}</td>
                    <td className="px-6 py-3 text-navy-800/70">{p.usedCount}{p.usageLimit !== null ? ` / ${p.usageLimit}` : ""}</td>
                    <td className="px-6 py-3"><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggleActive(p)} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => openEdit(p)} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Edit</button>
                        <button onClick={() => del(p)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <PromotionModal
          data={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); toast("Promotion saved"); }}
        />
      )}
    </div>
  );
}

function toFormPayload(p: Promotion) {
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    discountType: p.discountType,
    discountValue: p.discountValue,
    minOrderAmount: p.minOrderAmount,
    maxDiscountAmount: p.maxDiscountAmount,
    startDate: p.startDate ? p.startDate.slice(0, 10) : null,
    endDate: p.endDate ? p.endDate.slice(0, 10) : null,
    usageLimit: p.usageLimit,
    usageLimitPerUser: p.usageLimitPerUser,
  };
}

function PromotionModal({ data, onClose, onSaved }: { data: Form; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;
  const set = (k: keyof Form) => (v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Edit Promo Code" : "Add Promo Code"}</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F label="Code">
              <input
                value={form.code}
                onChange={(e) => set("code")(e.target.value.toUpperCase())}
                className="input font-mono uppercase"
                placeholder="SUMMER20"
              />
            </F>
            <F label="Discount Type">
              <select value={form.discountType} onChange={(e) => set("discountType")(e.target.value)} className="input">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount (LKR)</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </F>
          </div>
          <F label="Description (optional)">
            <input value={form.description} onChange={(e) => set("description")(e.target.value)} className="input" placeholder="20% off summer collection" />
          </F>

          {form.discountType !== "free_shipping" && (
            <div className="grid grid-cols-2 gap-4">
              <F label={form.discountType === "percentage" ? "Percentage (%)" : "Amount (LKR)"}>
                <NumIn v={form.discountValue} on={set("discountValue")} int={form.discountType === "percentage"} />
              </F>
              {form.discountType === "percentage" && (
                <F label="Max Discount (LKR, optional)">
                  <NumIn v={form.maxDiscountAmount} on={set("maxDiscountAmount")} placeholder="No cap" />
                </F>
              )}
            </div>
          )}

          <F label="Minimum Order Amount (LKR, optional)">
            <NumIn v={form.minOrderAmount} on={set("minOrderAmount")} placeholder="No minimum" />
          </F>

          <div className="grid grid-cols-2 gap-4">
            <F label="Start Date (optional)">
              <input type="date" value={form.startDate} onChange={(e) => set("startDate")(e.target.value)} className="input" />
            </F>
            <F label="End Date (optional)">
              <input type="date" value={form.endDate} onChange={(e) => set("endDate")(e.target.value)} className="input" />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Total Usage Limit (optional)">
              <NumIn v={form.usageLimit} on={set("usageLimit")} int placeholder="Unlimited" />
            </F>
            <F label="Limit Per User (optional)">
              <NumIn v={form.usageLimitPerUser} on={set("usageLimitPerUser")} int placeholder="Unlimited" />
            </F>
          </div>

          <label className="flex items-center gap-2 text-sm text-navy-800">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive")(e.target.checked)} className="rounded border-navy-800/30 text-brand focus:ring-brand" />
            Active
          </label>

          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function PromoImageCell({ promo, onChanged }: { promo: Promotion; onChanged: () => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("promotionId", String(promo.id));
      form.append("image", file);
      const res = await fetch("/api/admin/promotions/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/promotions/image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotionId: promo.id }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-navy-800/10 bg-navy-50">
        {promo.imageUrl ? (
          <Image src={promo.imageUrl} alt={promo.code} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-navy-800/25">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        />
        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="text-left text-xs font-semibold text-brand hover:underline disabled:opacity-40"
        >
          {promo.imageUrl ? "Change" : "Upload"}
        </button>
        {promo.imageUrl && (
          <button disabled={busy} onClick={remove} className="text-left text-xs font-semibold text-red-600 hover:underline disabled:opacity-40">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>{children}</div>;
}
function NumIn({ v, on, int, placeholder }: { v: string; on: (val: string) => void; int?: boolean; placeholder?: string }) {
  return (
    <input
      value={v}
      onChange={(e) => on(e.target.value.replace(int ? /[^0-9]/g : /[^0-9.]/g, ""))}
      className="input"
      inputMode={int ? "numeric" : "decimal"}
      placeholder={placeholder ?? "0"}
    />
  );
}
