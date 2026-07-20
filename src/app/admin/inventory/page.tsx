"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  image: string;
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(0);

  useEffect(() => {
    fetch("/api/admin/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => products.filter((p) => !search || `${p.sku} ${p.name}`.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const save = async (id: number) => {
    const val = Number(drafts[id]);
    if (Number.isNaN(val)) return;
    setSaving(id);
    try {
      await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stock: val }),
      });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: val } : p)));
      setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    } finally {
      setSaving(0);
    }
  };

  const lowStock = products.filter((p) => p.stock <= 10).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-800">Inventory</h1>
        {lowStock > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            {lowStock} item(s) low on stock
          </span>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-md" placeholder="Search by SKU or name…" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Current Stock</th>
              <th className="px-6 py-4">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-navy-800/50">No products</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-navy-50">
                        <Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" />
                      </div>
                      <span className="font-medium text-navy-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-navy-800/60">{p.sku}</td>
                  <td className="px-6 py-3">
                    <span className={`font-semibold ${p.stock <= 10 ? "text-amber-600" : "text-navy-800"}`}>{p.stock}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={drafts[p.id] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                        placeholder={String(p.stock)}
                        className="w-24 rounded-lg border border-navy-800/15 px-3 py-1.5 text-sm outline-none focus:border-brand"
                        inputMode="numeric"
                      />
                      <button
                        disabled={saving === p.id || drafts[p.id] === undefined || drafts[p.id] === ""}
                        onClick={() => save(p.id)}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
