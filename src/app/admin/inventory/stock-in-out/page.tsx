"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface Variant { id: number; sku: string; attributeSummary: string; stock: number; }
interface Product { id: number; sku: string; name: string; stock: number; productType: "simple" | "variable"; variants: Variant[]; }
interface StockItem { key: string; productId: number; variantId: number | null; label: string; sku: string; stock: number; }

export default function StockInOutPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    const response = await fetch("/api/admin/products?view=inventory", { cache: "no-store" });
    const data = await response.json();
    setProducts(data.products ?? []);
  };
  useEffect(() => { void loadProducts(); }, []);

  const items = useMemo<StockItem[]>(() => products.flatMap((product): StockItem[] =>
    product.productType === "variable" && product.variants.length
      ? product.variants.map((variant) => ({
          key: `v:${variant.id}`, productId: product.id, variantId: variant.id,
          label: `${product.name} — ${variant.attributeSummary || "Variation"}`,
          sku: variant.sku || product.sku, stock: variant.stock,
        }))
      : [{ key: `p:${product.id}`, productId: product.id, variantId: null, label: product.name, sku: product.sku, stock: product.stock }]
  ), [products]);
  const item = items.find((entry) => entry.key === selected);
  const matchingItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items.slice(0, 12);
    return items.filter((entry) => `${entry.label} ${entry.sku}`.toLowerCase().includes(term)).slice(0, 30);
  }, [items, search]);

  const selectItem = (entry: StockItem) => {
    setSelected(entry.key);
    setSearch(`${entry.label}${entry.sku ? ` (${entry.sku})` : ""}`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(quantity);
    if (!item || !Number.isInteger(amount) || amount < 1 || !reason.trim()) {
      toast("Select an item, enter a quantity and reason", "error"); return;
    }
    if (direction === "out" && amount > item.stock) {
      toast("Stock out quantity cannot exceed available stock", "error"); return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/inventory/movements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId, variantId: item.variantId, direction, quantity: amount, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save stock movement");
      toast(direction === "in" ? "Stock added successfully" : "Stock removed successfully");
      setQuantity(""); setReason(""); setSelected(""); setSearch("");
      await loadProducts();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save stock movement", "error");
    } finally { setSaving(false); }
  };

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-navy-800">Stock In / Stock Out</h1><p className="mt-1 text-sm text-navy-800/50">Record incoming or outgoing stock with a reason.</p></div>
      <Link href="/admin/inventory/movements" className="rounded-lg border border-navy-800/15 px-4 py-2 text-sm font-semibold text-navy-800 hover:border-brand hover:text-brand">Movement history</Link>
    </div>
    <form onSubmit={submit} className="mt-6 max-w-3xl space-y-6 rounded-2xl border border-navy-800/10 bg-white p-4 shadow-sm sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-wider text-brand">Step 1</p><h2 className="mt-1 font-bold text-navy-800">Choose what you want to do</h2></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setDirection("in")} className={`rounded-xl border px-5 py-4 text-left ${direction === "in" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-navy-800/10 text-navy-800/60"}`}><span className="block font-bold">Stock In</span><span className="text-xs">Increase available quantity</span></button>
        <button type="button" onClick={() => setDirection("out")} className={`rounded-xl border px-5 py-4 text-left ${direction === "out" ? "border-red-500 bg-red-50 text-red-700" : "border-navy-800/10 text-navy-800/60"}`}><span className="block font-bold">Stock Out</span><span className="text-xs">Decrease available quantity</span></button>
      </div>
      <div className="border-t border-navy-800/10 pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Step 2</p>
        <label className="mt-1 block"><span className="mb-2 block font-bold text-navy-800">Find product or variation</span><input value={search} onChange={(event) => { setSearch(event.target.value); setSelected(""); }} className="input" placeholder="Type product name or SKU…" autoComplete="off" /></label>
        {!item && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-navy-800/10">
            {matchingItems.length ? matchingItems.map((entry) => (
              <button key={entry.key} type="button" onClick={() => selectItem(entry)} className="flex w-full items-center justify-between gap-4 border-b border-navy-800/5 px-4 py-3 text-left last:border-0 hover:bg-brand/5 focus:bg-brand/5">
                <span><span className="block text-sm font-semibold text-navy-800">{entry.label}</span><span className="mt-0.5 block text-xs text-navy-800/45">SKU: {entry.sku || "Not set"}</span></span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${entry.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{entry.stock} in stock</span>
              </button>
            )) : <p className="px-4 py-8 text-center text-sm text-navy-800/50">No product or SKU matches “{search}”</p>}
          </div>
        )}
      </div>
      {item && <div className="rounded-xl border border-brand/20 bg-brand/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand">Selected item</p><p className="mt-1 font-bold text-navy-800">{item.label}</p><p className="text-xs text-navy-800/50">SKU: {item.sku || "Not set"}</p></div><button type="button" onClick={() => { setSelected(""); setSearch(""); }} className="text-xs font-semibold text-brand hover:underline">Change</button></div><div className="mt-4 flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm text-navy-800"><span className="text-navy-800/55">Current stock</span><strong className="text-xl">{item.stock}</strong>{quantity && Number(quantity) > 0 && <><span>→</span><strong className={`text-xl ${direction === "in" ? "text-emerald-600" : "text-red-600"}`}>{direction === "in" ? item.stock + Number(quantity) : item.stock - Number(quantity)}</strong><span className="text-xs text-navy-800/45">after update</span></>}</div></div>}
      <div className="border-t border-navy-800/10 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-brand">Step 3</p><h2 className="mt-1 font-bold text-navy-800">Enter quantity and reason</h2></div>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy-800">Quantity</span><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="input" placeholder="Enter quantity" required /></label>
      <div><span className="mb-2 block text-sm font-semibold text-navy-800">Quick reason</span><div className="flex flex-wrap gap-2">{(direction === "in" ? ["Supplier delivery", "Customer return", "Stock correction"] : ["Damaged item", "Shop use", "Stock correction"]).map((value) => <button key={value} type="button" onClick={() => setReason(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${reason === value ? "border-brand bg-brand/10 text-brand" : "border-navy-800/15 text-navy-800/60 hover:border-brand"}`}>{value}</button>)}</div></div>
      <label className="block"><span className="mb-1.5 block text-sm font-semibold text-navy-800">Reason / note</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} rows={3} className="input resize-none" placeholder="Select a quick reason or type a note…" required /></label>
      <button disabled={saving} className={`w-full rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${direction === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{saving ? "Saving…" : direction === "in" ? "Add Stock" : "Remove Stock"}</button>
    </form>
  </div>;
}
