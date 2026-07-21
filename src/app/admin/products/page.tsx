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
  sku: string; attributeSummary: string; price: string; salePrice: string; resellerPrice: string;
  wholesalePrice: string; wholesaleMinQty: string; productionCost: string; stockStatus: string;
  stock: string; lowStockThreshold: string; weightKg: string; lengthCm: string; widthCm: string;
  heightCm: string; image: string; isDefault: boolean;
}
interface LinkItem { linkedProductId: number; linkType: string; }
interface AttrData { id: number; name: string; values: { id: number; value: string }[]; }

const PAYMENT_METHODS = [
  { name: "Cash on Delivery", type: "OFFLINE" },
  { name: "OnePay", type: "ONLINE" },
] as const;

const blank = {
  id: 0, name: "", slug: "", sku: "", category: "men", productType: "simple",
  shortDescription: "", description: "",
  regularPrice: "", salePrice: "", resellerPrice: "", wholesalePrice: "", wholesaleMinQty: "50",
  productionCost: "", saleStart: "", saleEnd: "",
  stock: "", lowStockThreshold: "10", stockStatus: "in_stock", allowBackorder: false, soldIndividually: false,
  sizes: "", colors: "", image: "", images: "",
  badge: "", featured: true, isPublish: true, visibility: "public", isResellerProduct: true,
  paymentMethods: [] as string[], tags: "",
  weightKg: "", lengthCm: "", widthCm: "", heightCm: "",
  metaTitle: "", metaDescription: "", metaKeywords: "",
  variants: [] as Variant[],
  links: [] as LinkItem[],
  selectedAttrValues: {} as Record<number, number[]>,
};
type Form = typeof blank;
type TextFieldKey = "name" | "shortDescription" | "description" | "sku";
type FieldErrors = Partial<Record<TextFieldKey, string>>;

const TEXT_LIMITS: Record<TextFieldKey, number> = {
  name: 200,
  shortDescription: 500,
  description: 10000,
  sku: 60,
};

function validateTextFields(form: Form): FieldErrors {
  const errors: FieldErrors = {};
  const labels: Record<TextFieldKey, string> = {
    name: "Product name", shortDescription: "Short description", description: "Description", sku: "SKU",
  };

  (Object.keys(TEXT_LIMITS) as TextFieldKey[]).forEach((key) => {
    const value = form[key].trim();
    if (value.length > TEXT_LIMITS[key]) errors[key] = `${labels[key]} must be ${TEXT_LIMITS[key]} characters or fewer.`;
    else if (/[<>]/.test(value)) errors[key] = `${labels[key]} cannot contain < or > characters.`;
  });

  const name = form.name.trim();
  if (!name) errors.name = "Product name is required.";
  else if (name.length < 2) errors.name = "Product name must contain at least 2 characters.";

  const sku = form.sku.trim();
  if (sku && !/^[A-Za-z0-9._-]+$/.test(sku)) errors.sku = "SKU can only contain letters, numbers, dots, underscores, and hyphens.";
  return errors;
}

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
      variants: (p.variants ?? []).map((v: any) => ({
        sku: v.sku, attributeSummary: v.attributeSummary, price: str(v.price), salePrice: str(v.salePrice),
        resellerPrice: str(v.resellerPrice), wholesalePrice: str(v.wholesalePrice), wholesaleMinQty: str(v.wholesaleMinQty),
        productionCost: str(v.productionCost), stockStatus: v.stockStatus || "in_stock", stock: str(v.stock),
        lowStockThreshold: str(v.lowStockThreshold || 10), weightKg: str(v.weightKg), lengthCm: str(v.lengthCm),
        widthCm: str(v.widthCm), heightCm: str(v.heightCm), image: v.image || "", isDefault: !!v.isDefault,
      })),
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [paymentError, setPaymentError] = useState("");
  const isEdit = form.id > 0;
  const set = (k: keyof Form) => (v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in TEXT_LIMITS) setFieldErrors((current) => ({ ...current, [k]: undefined }));
    if (k === "paymentMethods") setPaymentError("");
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    const body = new FormData();
    files.forEach((file) => body.append("files", file));
    const response = await fetch("/api/admin/products/images", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Image upload failed");
    return (data.images ?? []).map((image: { url: string }) => image.url);
  };

  const selectFeaturedImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(""); setUploadingImages(true);
    try {
      const [url] = await uploadImages([file]);
      if (url) set("image")(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Image upload failed"); }
    finally { setUploadingImages(false); }
  };

  const selectGalleryImages = async (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    setError(""); setUploadingImages(true);
    try {
      const urls = await uploadImages(selected);
      setForm((current) => {
        const existing = current.images.split(",").map((value) => value.trim()).filter(Boolean);
        return { ...current, images: [...existing, ...urls].join(", ") };
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Image upload failed"); }
    finally { setUploadingImages(false); }
  };

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
          price: f.regularPrice, salePrice: f.salePrice, resellerPrice: f.resellerPrice,
          wholesalePrice: f.wholesalePrice, wholesaleMinQty: f.wholesaleMinQty, productionCost: f.productionCost,
          stockStatus: "in_stock", stock: "0", lowStockThreshold: f.lowStockThreshold,
          weightKg: f.weightKg, lengthCm: f.lengthCm, widthCm: f.widthCm, heightCm: f.heightCm,
          image: "", isDefault: i === 0,
        };
      });
      return { ...f, variants };
    });
  };

  const save = async () => {
    if (uploadingImages) { setError("Wait for the images to finish uploading."); return; }
    const validationErrors = validateTextFields(form);
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      const firstField = Object.keys(validationErrors)[0] as TextFieldKey;
      if (firstField === "sku") setTab("inventory");
      setError("Please correct the text-field errors before saving.");
      return;
    }
    if (form.productType === "variable" && form.variants.length === 0) {
      setTab("variations");
      setError("Generate at least one variation before saving a variable product.");
      return;
    }
    if (form.productType === "variable" && form.variants.some((variant) => !(Number(variant.price) > 0))) {
      setTab("variations");
      setError("Every variation needs a valid regular price.");
      return;
    }
    if (form.paymentMethods.length === 0) {
      setTab("payments");
      setPaymentError("Please select at least one payment method.");
      setError("Please select at least one payment method before saving.");
      return;
    }
    setError(""); setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        sizes: form.sizes.trim(),
        colors: form.colors.trim(),
        tags: form.tags.trim(),
        metaTitle: form.metaTitle.trim(),
        metaDescription: form.metaDescription.trim(),
        metaKeywords: form.metaKeywords.trim(),
      };
      const res = await fetch("/api/admin/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            <F label="Product Name" error={fieldErrors.name}><input value={form.name} onChange={(e) => set("name")(e.target.value)} className="input" placeholder="e.g. Classic Crew T-Shirt" required maxLength={TEXT_LIMITS.name} aria-invalid={Boolean(fieldErrors.name)} /></F>
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
            <F label="Product Short Description" error={fieldErrors.shortDescription}><input value={form.shortDescription} onChange={(e) => set("shortDescription")(e.target.value)} className="input" placeholder="One-line summary" maxLength={TEXT_LIMITS.shortDescription} aria-invalid={Boolean(fieldErrors.shortDescription)} /></F>
            <F label="Product Description" error={fieldErrors.description}><textarea rows={3} value={form.description} onChange={(e) => set("description")(e.target.value)} className="input resize-none" maxLength={TEXT_LIMITS.description} aria-invalid={Boolean(fieldErrors.description)} /></F>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm font-medium text-navy-800">Featured Image</p>
                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-navy-800/15 bg-navy-50/60 p-3 text-center transition hover:border-brand/60 hover:bg-brand-50/40">
                  {form.image ? (
                    <Image src={form.image} alt="Featured product preview" width={360} height={240} className="h-36 w-full rounded-lg object-contain" />
                  ) : (
                    <><span className="text-3xl text-brand">＋</span><span className="mt-2 text-sm font-semibold text-navy-800">Upload featured image</span><span className="mt-1 text-xs text-navy-800/45">JPG, PNG, WebP or GIF · max 6 MB</span></>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadingImages} onChange={(event) => { void selectFeaturedImage(event.target.files); event.target.value = ""; }} />
                </label>
                {form.image && <div className="mt-2 flex gap-2"><label className="cursor-pointer rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Replace<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadingImages} onChange={(event) => { void selectFeaturedImage(event.target.files); event.target.value = ""; }} /></label><button type="button" onClick={() => set("image")("")} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">Remove</button></div>}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-navy-800">Gallery Images</p>
                <label className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-navy-800/15 bg-navy-50/60 p-4 text-center transition hover:border-brand/60 hover:bg-brand-50/40">
                  <span className="text-sm font-semibold text-navy-800">＋ Add gallery images</span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploadingImages} onChange={(event) => { void selectGalleryImages(event.target.files); event.target.value = ""; }} />
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {form.images.split(",").map((value) => value.trim()).filter(Boolean).map((url, index, gallery) => (
                    <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-lg border border-navy-800/10 bg-navy-50">
                      <Image src={url} alt={`Gallery preview ${index + 1}`} width={120} height={100} className="h-20 w-full object-contain" />
                      <button type="button" aria-label={`Remove gallery image ${index + 1}`} onClick={() => set("images")(gallery.filter((_, itemIndex) => itemIndex !== index).join(", "))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-red-600 shadow">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {uploadingImages && <p className="text-sm font-medium text-brand">Uploading images…</p>}
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
                  <F label="SKU" error={fieldErrors.sku}><input value={form.sku} onChange={(e) => set("sku")(e.target.value)} className="input" placeholder="Auto if blank" maxLength={TEXT_LIMITS.sku} aria-invalid={Boolean(fieldErrors.sku)} /></F>
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
              </div>
            )}

            {/* VARIATIONS (variable) */}
            {tab === "variations" && (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#374151]">Product Variations</h3>
                  <button type="button" onClick={() => {
                    const hasSelection = Object.values(form.selectedAttrValues).some((ids) => ids.length > 0);
                    if (!hasSelection) {
                      setError("Please select attributes first in the Attributes tab.");
                      return;
                    }
                    setError("");
                    generateVariations();
                  }} className="btn-primary px-5 py-2 text-sm">Generate Variations</button>
                </div>
                {form.variants.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#d1d5db] bg-[#f9fafb] px-5 py-10 text-center text-sm text-[#6b7280]">
                    No variations yet. Select attributes and click &quot;Generate Variations&quot; to create them.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.variants.map((v, i) => (
                      <details key={`${v.attributeSummary}-${i}`} className="group rounded-lg border border-[#e5e7eb] bg-[#fafafa]" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-[#374151]">Variation #{i + 1}:</span>
                            {(v.attributeSummary || `Variant ${i + 1}`).split(" / ").map((value) => (
                              <span key={value} className="rounded-full bg-sky-100 px-2.5 py-1 text-xs text-sky-700">{value}</span>
                            ))}
                            {v.isDefault && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Default</span>}
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <button type="button" onClick={(event) => {
                              event.preventDefault(); event.stopPropagation();
                              setForm((f) => {
                                const variants = f.variants.filter((_, index) => index !== i);
                                if (variants.length && !variants.some((item) => item.isDefault)) variants[0] = { ...variants[0], isDefault: true };
                                return { ...f, variants };
                              });
                            }} className="text-xl leading-none text-red-500" aria-label={`Remove variation ${i + 1}`}>×</button>
                            <span className="text-[#6b7280] transition group-open:rotate-180">⌄</span>
                          </div>
                        </summary>
                        <div className="border-t border-[#e5e7eb] bg-white p-4">
                          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-[#374151]">
                            <input type="checkbox" checked={v.isDefault} onChange={(event) => {
                              if (!event.target.checked) return;
                              setForm((f) => ({ ...f, variants: f.variants.map((item, index) => ({ ...item, isDefault: index === i })) }));
                            }} className="h-4 w-4 rounded border-[#d1d5db] text-emerald-600 focus:ring-emerald-500" />
                            Is Default?
                          </label>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <VarField label="SKU"><input value={v.sku} onChange={(e) => updateVariant(setForm, i, "sku", e.target.value)} className="input" maxLength={60} /></VarField>
                            <VarMoney label="Regular Price" value={v.price} onChange={(value) => updateVariant(setForm, i, "price", value)} />
                            <VarMoney label="Sale Price" value={v.salePrice} onChange={(value) => updateVariant(setForm, i, "salePrice", value)} />
                            <VarMoney label="Reseller Price" value={v.resellerPrice} onChange={(value) => updateVariant(setForm, i, "resellerPrice", value)} />
                            <VarMoney label="Wholesale Price" value={v.wholesalePrice} onChange={(value) => updateVariant(setForm, i, "wholesalePrice", value)} />
                            <VarInt label="Wholesale Min Qty" value={v.wholesaleMinQty} onChange={(value) => updateVariant(setForm, i, "wholesaleMinQty", value)} />
                            <VarMoney label="Product Cost" value={v.productionCost} onChange={(value) => updateVariant(setForm, i, "productionCost", value)} />
                            <VarField label="Stock Status"><select value={v.stockStatus} onChange={(e) => updateVariant(setForm, i, "stockStatus", e.target.value)} className="input"><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="on_backorder">On Backorder</option></select></VarField>
                            <VarInt label="Stock Quantity" value={v.stock} onChange={(value) => updateVariant(setForm, i, "stock", value)} />
                            <VarMoney label="Weight (kg)" value={v.weightKg} onChange={(value) => updateVariant(setForm, i, "weightKg", value)} />
                            <VarMoney label="Length (cm)" value={v.lengthCm} onChange={(value) => updateVariant(setForm, i, "lengthCm", value)} />
                            <VarMoney label="Width (cm)" value={v.widthCm} onChange={(value) => updateVariant(setForm, i, "widthCm", value)} />
                            <VarMoney label="Height (cm)" value={v.heightCm} onChange={(value) => updateVariant(setForm, i, "heightCm", value)} />
                          </div>
                          <div className="mt-5">
                            <p className="mb-2 text-xs font-medium text-[#374151]">Variation Image</p>
                            <div className="flex items-center gap-3">
                              <label className={`cursor-pointer rounded-lg border border-[#d1d5db] px-3 py-2 text-xs font-medium text-[#374151] hover:border-brand hover:bg-brand-50 ${uploadingImages ? "pointer-events-none opacity-50" : ""}`}>
                                {uploadingImages ? "Uploading..." : "Upload Image"}
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={async (event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const [url] = await uploadImages([file]);
                                    if (url) updateVariant(setForm, i, "image", url);
                                  } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Image upload failed"); }
                                  event.target.value = "";
                                }} />
                              </label>
                              {v.image && <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]"><Image src={v.image} alt={`Variation ${i + 1}`} fill className="object-cover" /><button type="button" onClick={() => updateVariant(setForm, i, "image", "")} className="absolute right-0 top-0 grid h-5 w-5 place-items-center bg-red-500 text-xs text-white" aria-label="Remove variation image">×</button></div>}
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
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
              <div>
                <section className="pb-8">
                  <h3 className="mb-5 text-[15px] font-semibold text-[#374151]">Payment Methods</h3>
                  <div className="flex flex-wrap gap-x-10 gap-y-4">
                    {PAYMENT_METHODS.map((method) => {
                      const on = form.paymentMethods.includes(method.name);
                      return (
                        <label key={method.name} className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(event) => set("paymentMethods")(
                              event.target.checked
                                ? [...form.paymentMethods, method.name]
                                : form.paymentMethods.filter((name) => name !== method.name)
                            )}
                            className="h-5 w-5 rounded border-[#d1d5db] text-brand focus:ring-brand"
                          />
                          <span>
                            <span className="block text-sm text-[#374151]">{method.name}</span>
                            <span className="block text-xs text-[#9ca3af]">{method.type}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {paymentError && <p className="mt-3 text-xs font-medium text-red-600">{paymentError}</p>}
                </section>

                <section className="border-t border-[#e5e7eb] pt-8">
                  <h3 className="mb-5 text-[15px] font-semibold text-[#374151]">Others</h3>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.isResellerProduct}
                      onChange={(event) => set("isResellerProduct")(event.target.checked)}
                      className="h-5 w-5 rounded border-[#d1d5db] text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-[#374151]">Reseller Order</span>
                  </label>
                </section>
              </div>
            )}
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-navy-800/10 px-6 py-4">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving || uploadingImages} className="btn-primary">{uploadingImages ? "Uploading images…" : saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}</button>
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

function F({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>{children}{error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}</div>;
}
function VarField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium text-navy-800/60">{label}</label>{children}</div>;
}
function VarMoney({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <VarField label={label}><input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="input" /></VarField>;
}
function VarInt({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <VarField label={label}><input value={value} onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="input" /></VarField>;
}
function NumIn({ v, on, int, placeholder }: { v: string; on: (val: string) => void; int?: boolean; placeholder?: string }) {
  return <input value={v} onChange={(e) => on(e.target.value.replace(int ? /[^0-9]/g : /[^0-9.]/g, ""))} className="input" inputMode={int ? "numeric" : "decimal"} placeholder={placeholder ?? "0"} />;
}
function Check({ label, checked, on }: { label: string; checked: boolean; on: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-navy-800"><input type="checkbox" checked={checked} onChange={(e) => on(e.target.checked)} className="rounded border-navy-800/30 text-brand focus:ring-brand" />{label}</label>;
}
