"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
  stock: number;
  lowStockThreshold: number;
  image: string;
  productType: "simple" | "variable";
  variants: Variant[];
}

interface Row {
  key: string;
  image: string;
  name: string;
  variation: string | null;
  sku: string;
  stock: number;
  threshold: number;
}

export default function LowStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  const rows: Row[] = products.flatMap((p) => {
    if (p.productType === "variable" && p.variants.length > 0) {
      return p.variants
        .filter((v) => v.stock <= (v.lowStockThreshold ?? 10))
        .map((v) => ({
          key: `v:${v.id}`, image: p.image, name: p.name, variation: v.attributeSummary || null,
          sku: v.sku || p.sku, stock: v.stock, threshold: v.lowStockThreshold ?? 10,
        }));
    }
    if (p.stock <= (p.lowStockThreshold ?? 10)) {
      return [{ key: `p:${p.id}`, image: p.image, name: p.name, variation: null, sku: p.sku, stock: p.stock, threshold: p.lowStockThreshold ?? 10 }];
    }
    return [];
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Low Stock Alerts</h1>
      <p className="mt-1 text-sm text-navy-800/50">Products (and variations) at or below their low-stock threshold.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Variation</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Threshold</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">All products are well stocked 🎉</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.key} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-navy-50"><Image src={r.image} alt={r.name} width={40} height={40} className="h-full w-full object-cover" /></div>
                      <span className="font-medium text-navy-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-navy-800/70">{r.variation ?? "—"}</td>
                  <td className="px-6 py-3 text-navy-800/60">{r.sku}</td>
                  <td className="px-6 py-3 font-bold text-navy-800">{r.stock}</td>
                  <td className="px-6 py-3 text-navy-800/60">{r.threshold}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${r.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.stock === 0 ? "Out of stock" : "Low"}
                    </span>
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
