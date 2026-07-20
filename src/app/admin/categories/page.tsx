"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  parentName: string | null;
  imageUrl: string;
  productCount: number;
}

const blank = { id: 0, name: "", slug: "", parentId: "", imageUrl: "" };

export default function AdminCategoriesPage() {
  const { toast, confirm } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof blank | null>(null);

  const load = () => {
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCats(d.categories ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("new")) setEditing({ ...blank }); }, []);

  const del = async (c: Category) => {
    const ok = await confirm({
      title: "Delete category?",
      message: c.productCount > 0
        ? `“${c.name}” has ${c.productCount} product(s). Deleting it won't remove them, but they'll lose this category.`
        : `Delete the category “${c.name}”?`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setCats((prev) => prev.filter((x) => x.id !== c.id));
    await fetch("/api/admin/categories", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }),
    });
    toast(`Deleted “${c.name}”`);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Category</h1>
        <button onClick={() => setEditing({ ...blank })} className="btn-primary">+ Add Category</button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Parent</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : cats.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No categories</td></tr>
            ) : (
              cats.map((c) => (
                <tr key={c.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3 font-medium text-navy-800">{c.name}</td>
                  <td className="px-6 py-3 text-navy-800/60">{c.slug}</td>
                  <td className="px-6 py-3 text-navy-800/60">{c.parentName || "—"}</td>
                  <td className="px-6 py-3 text-navy-800/70">{c.productCount}</td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId ? String(c.parentId) : "", imageUrl: c.imageUrl })} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Edit</button>
                      <button onClick={() => del(c)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && <CategoryModal data={editing} cats={cats} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); toast("Category saved"); }} />}
    </div>
  );
}

function CategoryModal({ data, cats, onClose, onSaved }: { data: typeof blank; cats: Category[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
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
        <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Edit Category" : "Add Category"}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Name</label>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} className="input" placeholder="e.g. Men's Clothing" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Slug (optional)</label>
            <input value={form.slug} onChange={(e) => set("slug")(e.target.value)} className="input" placeholder="Auto from name if blank" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Parent Category</label>
            <select value={form.parentId} onChange={(e) => set("parentId")(e.target.value)} className="input">
              <option value="">None (top-level)</option>
              {cats.filter((c) => c.id !== form.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Image URL (optional)</label>
            <input value={form.imageUrl} onChange={(e) => set("imageUrl")(e.target.value)} className="input" placeholder="/images/…" />
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
