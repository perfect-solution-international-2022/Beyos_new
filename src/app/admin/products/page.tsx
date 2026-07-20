"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/ToastProvider";

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  visibility: string;
  productType: string;
  [k: string]: unknown;
}
interface Variant {
  sku: string; attributeSummary: string; price: string; resellerPrice: string; wholesalePrice: string; stock: string; isDefault: boolean;
}
interface LinkItem { linkedProductId: number; linkType: string; }
interface AttrData { id: number; name: string; values: { id: number; value: string }[]; }

const PAYMENT_METHODS = ["Cash on Delivery", "Card Payment", "Bank Transfer", "PayHere"];

const blank = {
  id: 0, name: "", slug: "", sku: "", category: "men", productType: "simple",
  shortDescription: "", description: "",
  regularPrice: "", salePrice: "", resellerPrice: "", wholesalePrice: "", wholesaleMinQty: "50",
  productionCost: "", saleStart: "", saleEnd: "",
  stock: "", lowStockThreshold: "10", stockStatus: "in_stock", allowBackorder: false, soldIndividually: false,
  sizes: "", colors: "", image: "", images: "",
  badge: "", featured: false, isPublish: true, visibility: "public", isResellerProduct: true,
  paymentMethods: [] as string[], tags: "",
  weightKg: "", lengthCm: "", widthCm: "", heightCm: "",
  metaTitle: "", metaDescription: "", metaKeywords: "",
  variants: [] as Variant[],
  links: [] as LinkItem[],
  selectedAttrValues: {} as Record<number, number[]>,
};
type Form = typeof blank;

export default function AdminProductsPage() {
  const { toast, confirm } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const standaloneNew = pathname === "/admin/products/new";
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
  const [attributes, setAttributes] = useState<AttrData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Form | null>(standaloneNew ? { ...blank } : null);

  const load = () => {
    fetch("/api/admin/products", { cache: "no-store" }).then((r) => r.json()).then((d) => setProducts(d.products ?? [])).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" }).then((r) => r.json()).then((d) => setCategories((d.categories ?? []).map((c: any) => ({ name: c.name, slug: c.slug })))).catch(() => {});
    fetch("/api/admin/attributes", { cache: "no-store" }).then((r) => r.json()).then((d) => setAttributes(d.attributes ?? [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => products.filter((p) => !search || `${p.sku} ${p.name}`.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const del = async (p: Product) => {
    const ok = await confirm({ title: "Delete product?", message: `Permanently delete “${p.name}”? This cannot be undone.`, confirmText: "Delete", danger: true });
    if (!ok) return;
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    toast(`Deleted “${p.name}”`);
  };

  const openEdit = (p: any) => {
    const arr = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
    const str = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));
    setEditing({
      ...blank, ...p,
      slug: "", // regenerated server-side; leave blank on edit
      regularPrice: str(p.regularPrice), salePrice: str(p.salePrice),
      resellerPrice: str(p.resellerPrice), wholesalePrice: str(p.wholesalePrice), wholesaleMinQty: str(p.wholesaleMinQty || 50),
      productionCost: str(p.productionCost), saleStart: p.saleStart || "", saleEnd: p.saleEnd || "",
      stock: str(p.stock), lowStockThreshold: str(p.lowStockThreshold || 10),
      sizes: arr(p.sizes), colors: arr(p.colors), images: arr(p.images),
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
      paymentMethods: Array.isArray(p.paymentMethods) ? p.paymentMethods : [],
      weightKg: str(p.weightKg), lengthCm: str(p.lengthCm), widthCm: str(p.widthCm), heightCm: str(p.heightCm),
      variants: (p.variants ?? []).map((v: any) => ({ sku: v.sku, attributeSummary: v.attributeSummary, price: str(v.price), resellerPrice: str(v.resellerPrice), wholesalePrice: str(v.wholesalePrice), stock: str(v.stock), isDefault: !!v.isDefault })),
      links: p.links ?? [],
      selectedAttrValues: {},
    });
  };

  if (standaloneNew) {
    return (
      <ProductModal
        data={editing ?? { ...blank }}
        categories={categories}
        attributes={attributes}
        allProducts={products}
        embedded
        onClose={() => router.push("/admin/products")}
        onSaved={() => {
          toast("Product created");
          router.push("/admin/products");
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">+ Create Product</Link>
      </div>

      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-md" placeholder="Search by SKU or name…" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Product</th><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Category</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-navy-800/50">No products</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-navy-50"><Image src={p.image} alt={p.name} width={40} height={40} className="h-full w-full object-cover" /></div>
                      <span className="font-medium text-navy-800">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-navy-800/60">{p.sku}</td>
                  <td className="px-6 py-3"><span className="badge bg-navy-50 capitalize text-navy-800/70">{p.productType}</span></td>
                  <td className="px-6 py-3 capitalize text-navy-800/60">{p.category}</td>
                  <td className="px-6 py-3 font-semibold text-navy-800">{formatPrice(p.price)}</td>
                  <td className="px-6 py-3"><span className={p.stock === 0 ? "text-red-500" : "text-navy-800/70"}>{p.stock}</span></td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Edit</button>
                      <button onClick={() => del(p)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductModal
          data={editing} categories={categories} attributes={attributes} allProducts={products}
          onClose={() => setEditing(null)}
          onSaved={(edit) => { setEditing(null); load(); toast(edit ? "Product updated" : "Product created"); }}
        />
      )}
    </div>
  );
}

/* ------------------------- Tabbed product form ------------------------- */
function ProductModal({ data, categories, attributes, allProducts, onClose, onSaved, embedded = false }: {
  data: Form; categories: { name: string; slug: string }[]; attributes: AttrData[]; allProducts: Product[];
  onClose: () => void; onSaved: (edit: boolean) => void; embedded?: boolean;
}) {
  const [form, setForm] = useState<Form>(data);
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;
  const set = (k: keyof Form) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const isVariable = form.productType === "variable";
  const tabs = isVariable
    ? ["general", "inventory", "attributes", "variations", "linked", "payments"]
    : ["general", "inventory", "linked", "payments"];
  const tabLabels: Record<string, string> = {
    general: "General", inventory: "Inventory", attributes: "Attributes",
    variations: "Variations", linked: "Linked Products", payments: "Payments and Others",
  };
  useEffect(() => { if (!tabs.includes(tab)) setTab(tabs[0]); }, [isVariable]); // eslint-disable-line

  const generateVariations = () => {
    const chosen = Object.entries(form.selectedAttrValues).filter(([, ids]) => ids.length);
    if (chosen.length === 0) { setForm((f) => ({ ...f, variants: [] })); return; }
    const groups = chosen.map(([attrId, ids]) => {
      const attr = attributes.find((a) => a.id === Number(attrId));
      return ids.map((vid) => attr?.values.find((v) => v.id === vid)?.value ?? "").filter(Boolean);
    });
    let combos: string[][] = [[]];
    for (const g of groups) combos = combos.flatMap((c) => g.map((v) => [...c, v]));
    setForm((f) => {
      const existing = new Map(f.variants.map((v) => [v.attributeSummary, v]));
      const variants: Variant[] = combos.map((c, i) => {
        const summary = c.join(" / ");
        return existing.get(summary) ?? {
          sku: `${f.sku || "VAR"}-${i + 1}`, attributeSummary: summary,
          price: f.regularPrice, resellerPrice: f.resellerPrice, wholesalePrice: f.wholesalePrice,
          stock: "0", isDefault: i === 0,
        };
      });
      return { ...f, variants };
    });
  };

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved(isEdit);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div
      className={embedded ? "w-full" : "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/50 p-4"}
      onClick={embedded ? undefined : onClose}
    >
      <div
        className={embedded ? "w-full rounded-2xl border border-navy-800/5 bg-white shadow-sm" : "my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-navy-800/10 px-6 py-4">
          <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Edit Product" : "Create Product"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-navy-800/40 hover:text-navy-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className={embedded ? "px-6 py-6" : "max-h-[76vh] overflow-y-auto px-6 py-5"}>
          {/* Top: identity */}
          <div className="space-y-4">
            <F label="Product Name"><input value={form.name} onChange={(e) => set("name")(e.target.value)} className="input" placeholder="e.g. Classic Crew T-Shirt" /></F>
            <div className="grid grid-cols-2 gap-4">
              <F label="Category">
                <select value={form.category} onChange={(e) => set("category")(e.target.value)} className="input">
                  {categories.length === 0 && <option value={form.category}>{form.category}</option>}
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </F>
              <F label="Product Type">
                <select value={form.productType} onChange={(e) => set("productType")(e.target.value)} className="input">
                  <option value="simple">Single Product</option>
                  <option value="variable">Variable Product</option>
                </select>
              </F>
            </div>
            <F label="Product Short Description"><input value={form.shortDescription} onChange={(e) => set("shortDescription")(e.target.value)} className="input" placeholder="One-line summary" /></F>
            <F label="Product Description"><textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} className="input resize-none" /></F>
            <div className="grid grid-cols-2 gap-4">
              <F label="Featured Image Path"><input value={form.image} onChange={(e) => set("image")(e.target.value)} className="input" placeholder="/images/products/…" /></F>
              <F label="Gallery Images (comma-separated)"><input value={form.images} onChange={(e) => set("images")(e.target.value)} className="input" placeholder="/images/…, /images/…" /></F>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-1 border-b border-navy-800/10">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? "border-brand bg-brand-50 text-brand" : "border-transparent text-navy-800/50 hover:text-navy-800"}`}>
                {tabLabels[t]}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            {/* GENERAL */}
            {tab === "general" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Regular Price (Rs)"><NumIn v={form.regularPrice} on={set("regularPrice")} /></F>
                  <F label="Sale Price (Rs)"><NumIn v={form.salePrice} on={set("salePrice")} placeholder="Optional" /></F>
                  <F label="Reseller Price (Rs)"><NumIn v={form.resellerPrice} on={set("resellerPrice")} placeholder="Auto 80% if blank" /></F>
                  <F label="Wholesale Price (Rs)"><NumIn v={form.wholesalePrice} on={set("wholesalePrice")} placeholder="Auto 72% if blank" /></F>
                  <F label="Wholesale Min Quantity"><NumIn v={form.wholesaleMinQty} on={set("wholesaleMinQty")} int /></F>
                  <F label="Product Cost"><NumIn v={form.productionCost} on={set("productionCost")} /></F>
                  <F label="Sale Start Date (Optional)"><input type="date" value={form.saleStart} onChange={(e) => set("saleStart")(e.target.value)} className="input" /></F>
                  <F label="Sale End Date (Optional)"><input type="date" value={form.saleEnd} onChange={(e) => set("saleEnd")(e.target.value)} className="input" /></F>
                </div>
                <h3 className="pt-2 text-sm font-bold text-navy-800">Shipping &amp; Dimensions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Weight (kg)"><NumIn v={form.weightKg} on={set("weightKg")} /></F>
                  <F label="Length (cm)"><NumIn v={form.lengthCm} on={set("lengthCm")} /></F>
                  <F label="Width (cm)"><NumIn v={form.widthCm} on={set("widthCm")} /></F>
                  <F label="Height (cm)"><NumIn v={form.heightCm} on={set("heightCm")} /></F>
                </div>
              </>
            )}

            {/* INVENTORY */}
            {tab === "inventory" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <F label="SKU"><input value={form.sku} onChange={(e) => set("sku")(e.target.value)} className="input" placeholder="Auto if blank" /></F>
                  <F label="Stock Quantity"><NumIn v={form.stock} on={set("stock")} int /></F>
                  <F label="Stock Status">
                    <select value={form.stockStatus} onChange={(e) => set("stockStatus")(e.target.value)} className="input">
                      <option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="on_backorder">On Backorder</option>
                    </select>
                  </F>
                  <F label="Low Stock Threshold"><NumIn v={form.lowStockThreshold} on={set("lowStockThreshold")} int /></F>
                </div>
                <Check label="Allow backorder when out of stock" checked={form.allowBackorder} on={set("allowBackorder")} />
                <Check label="Sold individually (limit one per order)" checked={form.soldIndividually} on={set("soldIndividually")} />
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <F label="Sizes (comma-separated)"><input value={form.sizes} onChange={(e) => set("sizes")(e.target.value)} className="input" placeholder="S, M, L, XL" /></F>
                  <F label="Colors (comma-separated)"><input value={form.colors} onChange={(e) => set("colors")(e.target.value)} className="input" placeholder="Black, White" /></F>
                </div>
              </>
            )}

            {/* ATTRIBUTES (variable) */}
            {tab === "attributes" && (
              <div className="space-y-4">
                <p className="text-sm text-navy-800/60">Select attribute values, then generate variations.</p>
                {attributes.map((a) => (
                  <div key={a.id} className="rounded-xl border border-navy-800/10 p-4">
                    <p className="text-sm font-semibold text-navy-800">{a.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.values.map((v) => {
                        const selected = (form.selectedAttrValues[a.id] ?? []).includes(v.id);
                        return (
                          <button key={v.id} type="button"
                            onClick={() => setForm((f) => {
                              const cur = f.selectedAttrValues[a.id] ?? [];
                              const next = selected ? cur.filter((x) => x !== v.id) : [...cur, v.id];
                              return { ...f, selectedAttrValues: { ...f.selectedAttrValues, [a.id]: next } };
                            })}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${selected ? "border-brand bg-brand-50 text-brand-700" : "border-navy-800/15 text-navy-800 hover:border-navy-800/40"}`}>
                            {v.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={generateVariations} className="btn-dark">Generate Variations →</button>
              </div>
            )}

            {/* VARIATIONS (variable) */}
            {tab === "variations" && (
              <div className="space-y-3">
                {form.variants.length === 0 ? (
                  <p className="text-sm text-navy-800/50">No variations yet. Pick attribute values in the Attributes tab and click “Generate Variations”.</p>
                ) : (
                  form.variants.map((v, i) => (
                    <div key={i} className="rounded-xl border border-navy-800/10 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-navy-800">{v.attributeSummary || `Variant ${i + 1}`}</p>
                        <label className="flex items-center gap-1.5 text-xs text-navy-800/60">
                          <input type="radio" checked={v.isDefault} onChange={() => setForm((f) => ({ ...f, variants: f.variants.map((x, j) => ({ ...x, isDefault: j === i })) }))} />
                          Default
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <VarField label="SKU"><input value={v.sku} onChange={(e) => updateVariant(setForm, i, "sku", e.target.value)} className="input" /></VarField>
                        <VarField label="Price"><input value={v.price} onChange={(e) => updateVariant(setForm, i, "price", e.target.value.replace(/[^0-9.]/g, ""))} className="input" /></VarField>
                        <VarField label="Reseller"><input value={v.resellerPrice} onChange={(e) => updateVariant(setForm, i, "resellerPrice", e.target.value.replace(/[^0-9.]/g, ""))} className="input" /></VarField>
                        <VarField label="Stock"><input value={v.stock} onChange={(e) => updateVariant(setForm, i, "stock", e.target.value.replace(/[^0-9]/g, ""))} className="input" /></VarField>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* LINKED PRODUCTS */}
            {tab === "linked" && (
              <div className="space-y-5">
                <LinkPicker label="Upsells" type="upsell" form={form} setForm={setForm} allProducts={allProducts} />
                <LinkPicker label="Cross-sells" type="cross_sell" form={form} setForm={setForm} allProducts={allProducts} />
                <LinkPicker label="Related Products" type="related" form={form} setForm={setForm} allProducts={allProducts} />
              </div>
            )}

            {/* PAYMENTS AND OTHERS */}
            {tab === "payments" && (
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy-800">Payment Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((pm) => {
                      const on = form.paymentMethods.includes(pm);
                      return (
                        <button key={pm} type="button"
                          onClick={() => set("paymentMethods")(on ? form.paymentMethods.filter((x) => x !== pm) : [...form.paymentMethods, pm])}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-brand bg-brand-50 text-brand-700" : "border-navy-800/15 text-navy-800 hover:border-navy-800/40"}`}>
                          {pm}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Badge">
                    <select value={form.badge} onChange={(e) => set("badge")(e.target.value)} className="input">
                      <option value="">None</option><option value="New">New</option><option value="Sale">Sale</option><option value="Bestseller">Bestseller</option>
                    </select>
                  </F>
                  <F label="Visibility">
                    <select value={form.visibility} onChange={(e) => set("visibility")(e.target.value)} className="input">
                      <option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden</option>
                    </select>
                  </F>
                </div>
                <F label="Tags (comma-separated)"><input value={form.tags} onChange={(e) => set("tags")(e.target.value)} className="input" placeholder="summer, cotton, casual" /></F>
                <div className="space-y-2">
                  <Check label="Featured on homepage" checked={form.featured} on={set("featured")} />
                  <Check label="Published (visible in store)" checked={form.isPublish} on={set("isPublish")} />
                  <Check label="Available to resellers" checked={form.isResellerProduct} on={set("isResellerProduct")} />
                </div>
                <h3 className="pt-2 text-sm font-bold text-navy-800">SEO</h3>
                <F label="Meta Title"><input value={form.metaTitle} onChange={(e) => set("metaTitle")(e.target.value)} className="input" /></F>
                <F label="Meta Description"><textarea rows={2} value={form.metaDescription} onChange={(e) => set("metaDescription")(e.target.value)} className="input resize-none" /></F>
                <F label="Meta Keywords"><input value={form.metaKeywords} onChange={(e) => set("metaKeywords")(e.target.value)} className="input" placeholder="comma, separated" /></F>
              </>
            )}
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-navy-800/10 px-6 py-4">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}</button>
        </div>
      </div>
    </div>
  );
}

function updateVariant(setForm: React.Dispatch<React.SetStateAction<Form>>, i: number, key: keyof Variant, value: string) {
  setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, [key]: value } : v)) }));
}

function LinkPicker({ label, type, form, setForm, allProducts }: {
  label: string; type: string; form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; allProducts: Product[];
}) {
  const selected = form.links.filter((l) => l.linkType === type).map((l) => l.linkedProductId);
  const toggle = (id: number) => setForm((f) => {
    const has = f.links.some((l) => l.linkType === type && l.linkedProductId === id);
    return { ...f, links: has ? f.links.filter((l) => !(l.linkType === type && l.linkedProductId === id)) : [...f.links, { linkedProductId: id, linkType: type }] };
  });
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-navy-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {allProducts.filter((p) => p.id !== form.id).map((p) => (
          <button key={p.id} type="button" onClick={() => toggle(p.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${selected.includes(p.id) ? "border-brand bg-brand-50 text-brand-700" : "border-navy-800/15 text-navy-800/70 hover:border-navy-800/40"}`}>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>{children}</div>;
}
function VarField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-navy-800/60">{label}</label>{children}</div>;
}
function NumIn({ v, on, int, placeholder }: { v: string; on: (val: string) => void; int?: boolean; placeholder?: string }) {
  return <input value={v} onChange={(e) => on(e.target.value.replace(int ? /[^0-9]/g : /[^0-9.]/g, ""))} className="input" inputMode={int ? "numeric" : "decimal"} placeholder={placeholder ?? "0"} />;
}
function Check({ label, checked, on }: { label: string; checked: boolean; on: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-navy-800"><input type="checkbox" checked={checked} onChange={(e) => on(e.target.checked)} className="rounded border-navy-800/30 text-brand focus:ring-brand" />{label}</label>;
}
