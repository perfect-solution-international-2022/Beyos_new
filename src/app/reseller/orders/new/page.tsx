"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";

interface RProduct {
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  resellerPrice: number;
  wholesalePrice: number;
  wholesaleMinQty: number;
  compareAtPrice: number | null;
  image: string;
  description: string;
  rating: number;
  reviews: number;
  stock: number;
}

interface CartLine {
  slug: string;
  sku: string;
  name: string;
  image: string;
  resellerPrice: number;
  sellingPrice: number;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<RProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetch("/api/reseller/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          !search ||
          `${p.sku} ${p.name}`.toLowerCase().includes(search.toLowerCase())
      ),
    [products, search]
  );

  const cartTotal = cart.reduce((s, l) => s + l.sellingPrice * l.quantity, 0);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addToCart = (line: CartLine) => {
    setCart((c) => {
      const existing = c.find((l) => l.slug === line.slug);
      if (existing)
        return c.map((l) =>
          l.slug === line.slug
            ? { ...l, quantity: l.quantity + line.quantity, sellingPrice: line.sellingPrice }
            : l
        );
      return [...c, line];
    });
    setSelected(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">Create New Order</h1>
        <button
          onClick={() => setShowCart(true)}
          disabled={cart.length === 0}
          className="btn-primary disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>
          Create Order{cartCount > 0 ? ` (${cartCount})` : ""}
        </button>
      </div>

      {/* Search */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-navy-800">Search Products</p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mt-3"
          placeholder="Search by SKU or Product Name…"
        />
      </div>

      {/* Product table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Available Qty</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading products…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No products found</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.slug} className="border-b border-navy-800/5 last:border-0 hover:bg-navy-50/40">
                  <td className="px-6 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-navy-50">
                      <Image src={p.image} alt={p.name} width={48} height={48} className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-brand">{p.sku}</td>
                  <td className="px-6 py-3 font-medium text-navy-800">{p.name}</td>
                  <td className="px-6 py-3 capitalize text-navy-800/60">{p.category}</td>
                  <td className="px-6 py-3 text-navy-800/70">{p.stock}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setSelected(p)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200"
                      aria-label={`Add ${p.name}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ProductModal product={selected} onClose={() => setSelected(null)} onAdd={addToCart} />
      )}
      {showCart && (
        <CartModal
          cart={cart}
          total={cartTotal}
          onClose={() => setShowCart(false)}
          onUpdate={setCart}
          onCreated={() => router.push("/reseller/orders")}
        />
      )}
    </div>
  );
}

/* ---------------- Product detail modal ---------------- */
function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: RProduct;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const [sellingPrice, setSellingPrice] = useState<string>(String(product.resellerPrice));
  const [quantity, setQuantity] = useState(1);
  const price = Number(sellingPrice) || 0;
  const tooLow = price < product.resellerPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div
        className="grid max-h-[90vh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-2xl bg-white shadow-2xl md:grid-cols-[1fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image + info */}
        <div className="p-6">
          <div className="aspect-square overflow-hidden rounded-xl bg-navy-50">
            <Image src={product.image} alt={product.name} width={400} height={400} className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="border-l border-navy-800/10 p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-navy-800">{product.name}</h2>
            <button onClick={onClose} aria-label="Close" className="text-navy-800/40 hover:text-navy-800">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-brand">
            ★ {product.rating.toFixed(1)} · {product.reviews} reviews
          </p>
          <p className="mt-3 text-sm text-navy-800/60">{product.description}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-2xl font-bold text-navy-800">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-navy-800/40 line-through">{formatPrice(product.compareAtPrice)}</span>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-navy-50 p-4 text-sm">
            <p className="font-semibold text-navy-800">Service Commitment</p>
            <ul className="mt-2 space-y-1.5 text-navy-800/70">
              <li>🚚 Delivery Charges: LKR 300.00</li>
              <li>📦 Return &amp; refund policy</li>
              <li>🔒 Security &amp; Privacy</li>
            </ul>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-navy-800">Your Selling Price</p>
            <p className="mt-1 text-xs text-navy-800/60">Reseller Price: {formatPrice(product.resellerPrice)}</p>
            <p className="text-xs text-navy-800/60">
              Wholesale: {formatPrice(product.wholesalePrice)} (Min: {product.wholesaleMinQty} units)
            </p>
            <input
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              className="input mt-2"
              placeholder="Enter your selling price"
              inputMode="decimal"
            />
            {tooLow && (
              <p className="mt-1 text-xs text-red-500">
                Selling price can&apos;t be below the reseller price.
              </p>
            )}
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-navy-800">Quantity</p>
            <div className="mt-2 inline-flex items-center rounded-full border border-navy-800/15">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center text-navy-800 hover:text-brand">−</button>
              <span className="w-10 text-center font-semibold">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="flex h-9 w-9 items-center justify-center text-navy-800 hover:text-brand">+</button>
            </div>
          </div>

          <button
            disabled={tooLow || price <= 0}
            onClick={() =>
              onAdd({
                slug: product.slug,
                sku: product.sku,
                name: product.name,
                image: product.image,
                resellerPrice: product.resellerPrice,
                sellingPrice: price,
                quantity,
              })
            }
            className="btn-primary mt-6 w-full disabled:opacity-50"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Cart / customer modal ---------------- */
function CartModal({
  cart,
  total,
  onClose,
  onUpdate,
  onCreated,
}: {
  cart: CartLine[];
  total: number;
  onClose: () => void;
  onUpdate: (c: CartLine[]) => void;
  onCreated: () => void;
}) {
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const profit = cart.reduce((s, l) => s + (l.sellingPrice - l.resellerPrice) * l.quantity, 0);

  const submit = async () => {
    setError("");
    if (!customer.name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reseller/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: cart.map((l) => ({ slug: l.slug, quantity: l.quantity, sellingPrice: l.sellingPrice })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not create order");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-800">Confirm Order</h2>
          <button onClick={onClose} aria-label="Close" className="text-navy-800/40 hover:text-navy-800">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <ul className="mt-4 divide-y divide-navy-800/10">
          {cart.map((l) => (
            <li key={l.slug} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-navy-50">
                <Image src={l.image} alt={l.name} width={48} height={48} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy-800">{l.name}</p>
                <p className="text-xs text-navy-800/50">{formatPrice(l.sellingPrice)} × {l.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-navy-800">{formatPrice(l.sellingPrice * l.quantity)}</span>
              <button
                onClick={() => onUpdate(cart.filter((x) => x.slug !== l.slug))}
                className="text-navy-800/30 hover:text-red-500"
                aria-label="Remove"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-1 border-t border-navy-800/10 pt-3 text-sm">
          <div className="flex justify-between text-navy-800/60"><span>Your profit</span><span className="font-semibold text-emerald-600">{formatPrice(profit)}</span></div>
          <div className="flex justify-between text-base font-bold text-navy-800"><span>Order total</span><span>{formatPrice(total)}</span></div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-navy-800">Customer Details</p>
          <input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} className="input" placeholder="Customer name" />
          <input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} className="input" placeholder="Customer phone" />
          <textarea value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} rows={2} className="input resize-none" placeholder="Delivery address" />
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        <button onClick={submit} disabled={submitting} className="btn-primary mt-5 w-full">
          {submitting ? "Placing Order…" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
