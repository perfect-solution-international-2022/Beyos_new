"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface Variant {
  id: number;
  sku: string;
  attributeSummary: string;
  stock: number;
  lowStockThreshold: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  image: string;
  productType: "simple" | "variable";
  variants: Variant[];
}

// A stable, unique key for either a whole simple product or a single
// variant row, so per-row draft/saving state never collides across rows.
type RowKey = string;
const simpleKey = (productId: number): RowKey => `p:${productId}`;
const variantKey = (variantId: number): RowKey => `v:${variantId}`;

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<RowKey, string>>({});
  const [saving, setSaving] = useState<RowKey | "">("");

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

  const saveSimple = async (product: Product) => {
    const key = simpleKey(product.id);
    const val = Number(drafts[key]);
    if (Number.isNaN(val)) return;
    setSaving(key);
    try {
      await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, stock: val }),
      });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: val } : p)));
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } finally {
      setSaving("");
    }
  };

  const saveVariant = async (product: Product, variant: Variant) => {
    const key = variantKey(variant.id);
    const val = Number(drafts[key]);
    if (Number.isNaN(val)) return;
    setSaving(key);
    try {
      const res = await fetch("/api/admin/products/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, stock: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update stock");
      setProducts((prev) => prev.map((p) => p.id !== product.id ? p : {
        ...p,
        stock: data.productStock,
        variants: p.variants.map((v) => v.id === variant.id ? { ...v, stock: val } : v),
      }));
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } finally {
      setSaving("");
    }
  };

  const isLow = (stock: number, threshold: number) => stock <= threshold;
  const lowStock = products.reduce((count, p) => {
    if (p.productType === "variable") {
      return count + p.variants.filter((v) => isLow(v.stock, v.lowStockThreshold)).length;
    }
    return count + (isLow(p.stock, p.lowStockThreshold || 10) ? 1 : 0);
  }, 0);

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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Variation</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Current Stock</th>
              <th className="px-6 py-4">Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-navy-800/50">No products</td></tr>
            ) : (
              filtered.flatMap((p) => {
                if (p.productType === "variable" && p.variants.length > 0) {
                  return p.variants.map((v, i) => {
                    const key = variantKey(v.id);
                    const low = isLow(v.stock, v.lowStockThreshold || 10);
                    return (
                      <tr key={key} className="border-b border-navy-800/5 last:border-0">
                        {i === 0 && (
                          <td className="px-6 py-3 align-top" rowSpan={p.variants.length}>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                                <Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" />
                              </div>
                              <span className="font-medium text-navy-800">{p.name}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-3 text-navy-800/70">{v.attributeSummary || "—"}</td>
                        <td className="px-6 py-3 text-navy-800/60">{v.sku || p.sku}</td>
                        <td className="px-6 py-3">
                          <span className={`font-semibold ${low ? "text-amber-600" : "text-navy-800"}`}>{v.stock}</span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              value={drafts[key] ?? ""}
                              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
                              placeholder={String(v.stock)}
                              className="w-24 rounded-lg border border-navy-800/15 px-3 py-1.5 text-sm outline-none focus:border-brand"
                              inputMode="numeric"
                            />
                            <button
                              disabled={saving === key || drafts[key] === undefined || drafts[key] === ""}
                              onClick={() => saveVariant(p, v)}
                              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                }

                const key = simpleKey(p.id);
                const low = isLow(p.stock, p.lowStockThreshold || 10);
                return [
                  <tr key={key} className="border-b border-navy-800/5 last:border-0">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-navy-50">
                          <Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <span className="font-medium text-navy-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-navy-800/40">—</td>
                    <td className="px-6 py-3 text-navy-800/60">{p.sku}</td>
                    <td className="px-6 py-3">
                      <span className={`font-semibold ${low ? "text-amber-600" : "text-navy-800"}`}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          value={drafts[key] ?? ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
                          placeholder={String(p.stock)}
                          className="w-24 rounded-lg border border-navy-800/15 px-3 py-1.5 text-sm outline-none focus:border-brand"
                          inputMode="numeric"
                        />
                        <button
                          disabled={saving === key || drafts[key] === undefined || drafts[key] === ""}
                          onClick={() => saveSimple(p)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>,
                ];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
