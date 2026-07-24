"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface AttrValue { id: number; value: string; }
interface Attribute { id: number; name: string; slug: string; values: AttrValue[]; }

export default function AdminAttributesPage() {
  const { toast, confirm } = useToast();
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newValueFor, setNewValueFor] = useState<Record<number, string>>({});

  const load = () => {
    fetch("/api/admin/attributes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAttrs(d.attributes ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("new")) setCreating(true); }, []);

  const addValue = async (attributeId: number) => {
    const value = (newValueFor[attributeId] ?? "").trim();
    if (!value) return;
    await fetch("/api/admin/attributes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributeId, values: [value] }),
    });
    setNewValueFor((s) => ({ ...s, [attributeId]: "" }));
    load();
    toast(`Added value “${value}”`);
  };

  const delValue = async (value: AttrValue) => {
    const ok = await confirm({
      title: "Delete value?",
      message: `Remove the value “${value.value}” from this attribute?`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setAttrs((prev) => prev.map((a) => ({ ...a, values: a.values.filter((v) => v.id !== value.id) })));
    await fetch("/api/admin/attributes", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valueId: value.id }),
    });
    toast(`Deleted “${value.value}”`);
  };

  const delAttr = async (attr: Attribute) => {
    const ok = await confirm({
      title: "Delete attribute?",
      message: `This deletes “${attr.name}” and all ${attr.values.length} of its values. This cannot be undone.`,
      confirmText: "Delete attribute",
      danger: true,
    });
    if (!ok) return;
    setAttrs((prev) => prev.filter((a) => a.id !== attr.id));
    await fetch("/api/admin/attributes", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: attr.id }),
    });
    toast(`Deleted attribute “${attr.name}”`);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Attributes</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">+ Add Attribute</button>
      </div>

      {loading ? (
        <p className="mt-8 text-navy-800/50">Loading…</p>
      ) : attrs.length === 0 ? (
        <p className="mt-8 text-navy-800/50">No attributes yet.</p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {attrs.map((a) => (
            <div key={a.id} className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-navy-800">{a.name}</h2>
                  <p className="text-xs text-navy-800/40">{a.values.length} values</p>
                </div>
                <button onClick={() => delAttr(a)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {a.values.map((v) => (
                  <span key={v.id} className="inline-flex items-center gap-1.5 rounded-full border border-navy-800/10 bg-navy-50 py-1 pl-3 pr-1.5 text-sm text-navy-800">
                    {v.value}
                    <button onClick={() => delValue(v)} aria-label={`Remove ${v.value}`} className="flex h-4 w-4 items-center justify-center rounded-full text-navy-800/40 hover:bg-red-100 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={newValueFor[a.id] ?? ""}
                  onChange={(e) => setNewValueFor((s) => ({ ...s, [a.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") addValue(a.id); }}
                  className="input flex-1"
                  placeholder="Add a value…"
                />
                <button onClick={() => addValue(a.id)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Add</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <NewAttributeModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); toast("Attribute created"); }} />}
    </div>
  );
}

function NewAttributeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [values, setValues] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/attributes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributeName: name, values }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">Add Attribute</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Attribute Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Size, Color, Material" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Values (comma-separated)</label>
            <input value={values} onChange={(e) => setValues(e.target.value)} className="input" placeholder="S, M, L, XL" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
