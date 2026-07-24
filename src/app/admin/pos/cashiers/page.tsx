"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface Cashier {
  id: number;
  name: string;
  isActive: boolean;
  onShift: boolean;
  createdAt: string;
}

const blank = { id: 0, name: "", pin: "" };

export default function AdminPosCashiersPage() {
  const { toast, confirm } = useToast();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof blank | null>(null);

  const load = () => {
    fetch("/api/admin/pos/cashiers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCashiers(d.cashiers ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (c: Cashier) => {
    const ok = await confirm({
      title: "Delete cashier?",
      message: c.onShift
        ? `${c.name} currently has an open shift. Deleting them may orphan that shift's records.`
        : `Delete ${c.name}? This cannot be undone.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setCashiers((prev) => prev.filter((x) => x.id !== c.id));
    await fetch("/api/admin/pos/cashiers", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }),
    });
    toast(`Deleted ${c.name}`);
  };

  const toggleActive = async (c: Cashier) => {
    setCashiers((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch("/api/admin/pos/cashiers", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">POS Cashiers</h1>
        <button onClick={() => setEditing({ ...blank })} className="btn-primary">+ Add Cashier</button>
      </div>
      <p className="mt-1 text-sm text-navy-800/50">
        Staff who can log into the register with a PIN.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Shift</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : cashiers.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No cashiers yet</td></tr>
            ) : (
              cashiers.map((c) => (
                <tr key={c.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-navy-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge ${c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-navy-50 text-navy-800/60"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {c.onShift ? (
                      <span className="badge bg-blue-100 text-blue-700">On shift</span>
                    ) : (
                      <span className="text-navy-800/40">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => toggleActive(c)} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">
                        {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => setEditing({ id: c.id, name: c.name, pin: "" })} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Edit</button>
                      <button onClick={() => del(c)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CashierModal data={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); toast("Cashier saved"); }} />
      )}
    </div>
  );
}

function CashierModal({ data, onClose, onSaved }: { data: typeof blank; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/pos/cashiers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: form.id, name: form.name, pin: form.pin || undefined } : { name: form.name, pin: form.pin }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Edit Cashier" : "Add Cashier"}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. Nadeesha" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">
              {isEdit ? "New PIN (leave blank to keep current)" : "PIN (4–6 digits)"}
            </label>
            <input
              value={form.pin}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) }))}
              className="input font-mono"
              placeholder="••••"
              inputMode="numeric"
            />
          </div>
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
