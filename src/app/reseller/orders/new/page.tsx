"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface Variant {
  id: number; sku: string; summary: string; price: number; resellerPrice: number;
  wholesalePrice: number; stock: number; image: string; isDefault: boolean;
}
interface RProduct {
  slug: string; sku: string; name: string; category: string; price: number; resellerPrice: number;
  wholesalePrice: number; wholesaleMinQty: number; compareAtPrice: number | null; image: string;
  description: string; rating: number; reviews: number; stock: number; productType: string; variants: Variant[];
}
interface PricingRules { allowPriceOverride: boolean; minMarkupPct: number; maxMarkupPct: number | null }
interface CartLine {
  key: string; slug: string; variantId: number | null; variantSummary: string; sku: string; name: string;
  image: string; resellerPrice: number; wholesalePrice: number; wholesaleMinQty: number;
  sellingPrice: number; quantity: number; stock: number;
}
interface CourierOption { id: number; name: string }
type LocationMap = Record<string, Record<string, string[]>>;

const DELIVERY_FEE = 300;

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<RProduct[]>([]);
  const [rules, setRules] = useState<PricingRules>({ allowPriceOverride: true, minMarkupPct: 0, maxMarkupPct: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetch("/api/reseller/products", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      setProducts(data.products ?? []);
      if (data.pricingRules) setRules(data.pricingRules);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => products.filter((p) => !search || `${p.sku} ${p.name}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const cartTotal = cart.reduce((sum, line) => sum + line.sellingPrice * line.quantity, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addToCart = (line: CartLine) => {
    setCart((current) => {
      const existing = current.find((item) => item.key === line.key);
      if (!existing) return [...current, line];
      const quantity = Math.min(line.stock, existing.quantity + line.quantity);
      const resellerPrice = quantity >= line.wholesaleMinQty ? line.wholesalePrice : line.resellerPrice;
      return current.map((item) => item.key === line.key ? { ...item, quantity, resellerPrice, sellingPrice: line.sellingPrice } : item);
    });
    setSelected(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-navy-800">Create New Order</h1><p className="mt-1 text-sm text-navy-800/55">Select the exact product option, set the customer price, then add delivery details.</p></div>
        <button onClick={() => setShowCart(true)} disabled={!cart.length} className="btn-primary disabled:opacity-50">Create Order{cartCount ? ` (${cartCount})` : ""}</button>
      </div>
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <label className="text-sm font-bold text-navy-800" htmlFor="reseller-search">Search Products</label>
        <input id="reseller-search" value={search} onChange={(e) => setSearch(e.target.value)} className="input mt-3" placeholder="Search by SKU or product name…" />
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
          <th className="px-6 py-4">Image</th><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Product</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Available</th><th className="px-6 py-4 text-right">Action</th>
        </tr></thead><tbody>
          {loading ? <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading products…</td></tr> : !filtered.length ? <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No products found</td></tr> : filtered.map((p) => {
            const stock = p.variants.length ? p.variants.reduce((sum, variant) => sum + variant.stock, 0) : p.stock;
            return <tr key={p.slug} className="border-b border-navy-800/5 last:border-0 hover:bg-navy-50/40">
              <td className="px-6 py-3"><div className="h-12 w-12 overflow-hidden rounded-lg bg-navy-50"><Image src={p.image} alt={p.name} width={48} height={48} className="h-full w-full object-cover" /></div></td>
              <td className="px-6 py-3 font-medium text-brand">{p.sku}</td><td className="px-6 py-3 font-medium text-navy-800">{p.name}{p.variants.length ? <span className="ml-2 text-xs font-normal text-navy-800/45">{p.variants.length} options</span> : null}</td>
              <td className="px-6 py-3 capitalize text-navy-800/60">{p.category}</td><td className="px-6 py-3 text-navy-800/70">{stock}</td>
              <td className="px-6 py-3 text-right"><button onClick={() => setSelected(p)} disabled={stock < 1} className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-40" aria-label={`Add ${p.name}`}>+ Add</button></td>
            </tr>;
          })}
        </tbody></table>
      </div>
      {selected && <ProductModal product={selected} rules={rules} onClose={() => setSelected(null)} onAdd={addToCart} />}
      {showCart && <CartModal cart={cart} merchandiseTotal={cartTotal} onClose={() => setShowCart(false)} onUpdate={setCart} onCreated={() => router.push("/reseller/orders")} />}
    </div>
  );
}

function ProductModal({ product, rules, onClose, onAdd }: { product: RProduct; rules: PricingRules; onClose: () => void; onAdd: (line: CartLine) => void }) {
  const defaultVariant = product.variants.find((variant) => variant.isDefault) ?? product.variants[0] ?? null;
  const [variantId, setVariantId] = useState<number | null>(defaultVariant?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const variant = product.variants.find((item) => item.id === variantId) ?? null;
  const stock = variant?.stock ?? product.stock;
  const normalCost = variant?.resellerPrice ?? product.resellerPrice;
  const wholesaleCost = variant?.wholesalePrice ?? product.wholesalePrice;
  const cost = quantity >= product.wholesaleMinQty ? wholesaleCost : normalCost;
  const retailPrice = variant?.price ?? product.price;
  const minPrice = Math.max(cost, cost * (1 + rules.minMarkupPct / 100));
  const maxPrice = rules.maxMarkupPct == null ? null : cost * (1 + rules.maxMarkupPct / 100);
  const [sellingPrice, setSellingPrice] = useState(String(Math.max(retailPrice, minPrice)));
  useEffect(() => { setQuantity(1); setSellingPrice(String(Math.max(retailPrice, minPrice))); }, [variantId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (Number(sellingPrice) < minPrice) setSellingPrice(String(minPrice)); }, [minPrice]); // eslint-disable-line react-hooks/exhaustive-deps
  const price = Number(sellingPrice) || 0;
  const invalidPrice = price < minPrice || (maxPrice != null && price > maxPrice);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
    <div className="grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
      <div className="p-6"><div className="aspect-square overflow-hidden rounded-xl bg-navy-50"><Image src={variant?.image || product.image} alt={product.name} width={520} height={520} className="h-full w-full object-contain" /></div></div>
      <div className="border-navy-800/10 p-6 md:border-l"><div className="flex justify-between gap-4"><div><h2 className="text-xl font-bold text-navy-800">{product.name}</h2><p className="mt-1 text-sm text-brand">SKU: {variant?.sku || product.sku}</p></div><button onClick={onClose} aria-label="Close" className="text-2xl text-navy-800/40">×</button></div>
        <p className="mt-3 text-sm text-navy-800/60">{product.description}</p>
        {product.variants.length > 0 && <div className="mt-5"><label className="text-sm font-semibold text-navy-800" htmlFor="variant">Size / colour / option</label><select id="variant" className="input mt-2" value={variantId ?? ""} onChange={(e) => setVariantId(Number(e.target.value))}>{product.variants.map((item) => <option key={item.id} value={item.id} disabled={item.stock < 1}>{item.summary || item.sku} — {item.stock} available</option>)}</select></div>}
        <div className="mt-5 rounded-xl border-2 border-brand/25 bg-brand/5 p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-navy-800/55">Your reseller price</p><p className="mt-1 text-3xl font-extrabold text-brand">{formatPrice(cost)}</p><p className="mt-1 text-xs text-navy-800/60">{quantity >= product.wholesaleMinQty ? "Wholesale price active" : `Wholesale ${formatPrice(wholesaleCost)} from ${product.wholesaleMinQty} units`}</p></div>
        <div className="mt-5"><label className="text-sm font-semibold text-navy-800" htmlFor="selling-price">Customer selling price</label><input id="selling-price" disabled={!rules.allowPriceOverride} value={rules.allowPriceOverride ? sellingPrice : String(retailPrice)} onChange={(e) => setSellingPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="input mt-2 disabled:bg-navy-50" inputMode="decimal" />
          <p className={`mt-1 text-xs ${invalidPrice ? "text-red-600" : "text-navy-800/50"}`}>{!rules.allowPriceOverride ? "The admin has fixed the customer price." : `Allowed: from ${formatPrice(minPrice)}${maxPrice == null ? "" : ` to ${formatPrice(maxPrice)}`}`}</p></div>
        <div className="mt-4"><p className="text-sm font-semibold text-navy-800">Quantity</p><div className="mt-2 inline-flex items-center rounded-full border border-navy-800/15"><button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-10 w-10">−</button><span className="w-12 text-center font-semibold">{quantity}</span><button onClick={() => setQuantity((q) => Math.min(stock, q + 1))} className="h-10 w-10">+</button></div><span className="ml-3 text-xs text-navy-800/50">{stock} available</span></div>
        <button disabled={invalidPrice || stock < 1 || quantity > stock} onClick={() => onAdd({ key: `${product.slug}:${variantId ?? "base"}`, slug: product.slug, variantId, variantSummary: variant?.summary || "", sku: variant?.sku || product.sku, name: product.name, image: variant?.image || product.image, resellerPrice: cost, wholesalePrice: wholesaleCost, wholesaleMinQty: product.wholesaleMinQty, sellingPrice: rules.allowPriceOverride ? price : retailPrice, quantity, stock })} className="btn-primary mt-6 w-full disabled:opacity-50">Add to order</button>
      </div>
    </div>
  </div>;
}

function CartModal({ cart, merchandiseTotal, onClose, onUpdate, onCreated }: { cart: CartLine[]; merchandiseTotal: number; onClose: () => void; onUpdate: (cart: CartLine[]) => void; onCreated: () => void }) {
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", addressLine1: "", addressLine2: "", province: "", district: "", districtId: null as number | null, city: "", cityId: null as number | null, postalCode: "", notes: "" });
  const [locations, setLocations] = useState<LocationMap>({});
  const [courierDistricts, setCourierDistricts] = useState<CourierOption[]>([]);
  const [courierCities, setCourierCities] = useState<CourierOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/reseller/locations").then((r) => r.json()).then((data) => { setLocations(data.provinces ?? {}); setCourierDistricts(data.districts ?? []); }); }, []);
  const districtNames = customer.province ? Object.keys(locations[customer.province] ?? {}) : [];
  const localCities = customer.province && customer.district ? locations[customer.province]?.[customer.district] ?? [] : [];
  const profit = cart.reduce((sum, line) => sum + (line.sellingPrice - line.resellerPrice) * line.quantity, 0);
  const total = merchandiseTotal + DELIVERY_FEE;
  const update = (key: keyof typeof customer, value: string | number | null) => setCustomer((current) => ({ ...current, [key]: value }));

  const selectDistrict = async (name: string) => {
    const match = courierDistricts.find((item) => item.name.toLowerCase() === name.toLowerCase());
    setCustomer((current) => ({ ...current, district: name, districtId: match?.id ?? null, city: "", cityId: null }));
    setCourierCities([]);
    if (match) {
      const data = await fetch(`/api/reseller/locations?districtId=${match.id}`).then((r) => r.json()).catch(() => ({}));
      setCourierCities(data.cities ?? []);
    }
  };
  const submit = async () => {
    setError("");
    if (!customer.name.trim() || !customer.phone.trim() || !customer.addressLine1.trim() || !customer.province || !customer.district || !customer.city) { setError("Customer name, phone and complete delivery address are required."); return; }
    if (!/^(?:\+94|94|0)?7\d{8}$/.test(customer.phone.replace(/[\s()-]/g, ""))) { setError("Enter a valid Sri Lankan mobile number."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/reseller/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, items: cart.map((line) => ({ slug: line.slug, variantId: line.variantId, quantity: line.quantity, sellingPrice: line.sellingPrice })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create order");
      onCreated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create order"); } finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-3" onClick={onClose}><div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
    <div className="flex justify-between"><div><h2 className="text-xl font-bold text-navy-800">Confirm delivery order</h2><p className="text-sm text-navy-800/50">Koombiyo delivery details</p></div><button onClick={onClose} aria-label="Close" className="text-2xl text-navy-800/40">×</button></div>
    <ul className="mt-4 divide-y divide-navy-800/10">{cart.map((line) => <li key={line.key} className="flex items-center gap-3 py-3"><Image src={line.image} alt={line.name} width={48} height={48} className="h-12 w-12 rounded-lg object-contain" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-navy-800">{line.name}</p><p className="text-xs text-navy-800/50">{line.variantSummary || line.sku} · {formatPrice(line.sellingPrice)} × {line.quantity}</p></div><span className="text-sm font-bold">{formatPrice(line.sellingPrice * line.quantity)}</span><button aria-label={`Remove ${line.name}`} onClick={() => onUpdate(cart.filter((item) => item.key !== line.key))} className="text-red-500">×</button></li>)}</ul>
    <div className="mt-3 space-y-1 border-t border-navy-800/10 pt-3 text-sm"><div className="flex justify-between"><span>Merchandise</span><span>{formatPrice(merchandiseTotal)}</span></div><div className="flex justify-between"><span>Delivery</span><span>{formatPrice(DELIVERY_FEE)}</span></div><div className="flex justify-between text-emerald-700"><span>Your profit</span><span>{formatPrice(profit)}</span></div><div className="flex justify-between text-lg font-bold text-navy-800"><span>Customer pays</span><span>{formatPrice(total)}</span></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <input aria-label="Customer name" value={customer.name} onChange={(e) => update("name", e.target.value)} className="input" placeholder="Customer name *" />
      <input aria-label="Customer phone" value={customer.phone} onChange={(e) => update("phone", e.target.value)} className="input" placeholder="Mobile number *" />
      <input aria-label="Customer email" type="email" value={customer.email} onChange={(e) => update("email", e.target.value)} className="input sm:col-span-2" placeholder="Email (optional)" />
      <select aria-label="Province" className="input" value={customer.province} onChange={(e) => setCustomer((current) => ({ ...current, province: e.target.value, district: "", districtId: null, city: "", cityId: null }))}><option value="">Select province *</option>{Object.keys(locations).map((name) => <option key={name}>{name}</option>)}</select>
      <select aria-label="District" className="input" disabled={!customer.province} value={customer.district} onChange={(e) => selectDistrict(e.target.value)}><option value="">Select district *</option>{districtNames.map((name) => <option key={name}>{name}</option>)}</select>
      <select aria-label="City" className="input" disabled={!customer.district} value={customer.city} onChange={(e) => { const name = e.target.value; const match = courierCities.find((item) => item.name === name); setCustomer((current) => ({ ...current, city: name, cityId: match?.id ?? null })); }}><option value="">Select city *</option>{(courierCities.length ? courierCities.map((item) => item.name) : localCities).map((name) => <option key={name}>{name}</option>)}</select>
      <input aria-label="Postal code" value={customer.postalCode} onChange={(e) => update("postalCode", e.target.value)} className="input" placeholder="Postal code" />
      <input aria-label="Address line 1" value={customer.addressLine1} onChange={(e) => update("addressLine1", e.target.value)} className="input sm:col-span-2" placeholder="Address line 1 *" />
      <input aria-label="Address line 2" value={customer.addressLine2} onChange={(e) => update("addressLine2", e.target.value)} className="input sm:col-span-2" placeholder="Address line 2 (optional)" />
      <textarea aria-label="Delivery notes" value={customer.notes} onChange={(e) => update("notes", e.target.value)} className="input resize-none sm:col-span-2" rows={2} placeholder="Delivery notes (optional)" />
    </div>
    {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
    <button onClick={submit} disabled={submitting || !cart.length} className="btn-primary mt-5 w-full disabled:opacity-50">{submitting ? "Placing order…" : `Place delivery order · ${formatPrice(total)}`}</button>
  </div></div>;
}
