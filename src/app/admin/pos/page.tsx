"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/ToastProvider";
import { useAuth } from "@/context/AuthProvider";
import { SRI_LANKA_LOCATIONS } from "@/lib/sri-lanka-locations";
import POSReceiptBill from "@/components/POSReceiptBill";

interface Product {
  slug: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  sizes: string[];
  colors: string[];
  weightKg: number;
}

interface CartLine {
  slug: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  sizes: string[];
  colors: string[];
  size: string;
  color: string;
  quantity: number;
  weightKg: number;
}

interface Customer {
  id: string; name: string; email: string; phone: string; addressLine1: string; addressLine2: string;
  city: string; district: string; province: string; postalCode: string;
}

interface Receipt {
  receiptNumber: string;
  items: { name: string; sku?: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }[];
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  amountTendered: number | null;
  changeDue: number | null;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  createdAt: string;
}

export default function AdminPosRegisterPage() {
  return (
    <Suspense fallback={null}>
      <AdminPosRegister />
    </Suspense>
  );
}

function AdminPosRegister() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editReceipt = searchParams.get("edit");
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", province: "", district: "", city: "", postalCode: "" });
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryProvince, setDeliveryProvince] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editReceipt));

  useEffect(() => {
    fetch("/api/admin/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).map((p: any) => ({
        slug: p.slug, sku: p.sku, name: p.name, price: p.price, stock: p.stock,
        image: p.image, sizes: p.sizes ?? [], colors: p.colors ?? [], weightKg: Number(p.weightKg) || 0,
      }))));
  }, []);

  // Load an existing sale for editing (e.g. a cashier fixing a mistake) once
  // the live product catalog is available, so cart lines get real stock/sizes/colors.
  useEffect(() => {
    if (!editReceipt || products.length === 0) return;
    setLoadingEdit(true);
    fetch(`/api/pos/sales/${encodeURIComponent(editReceipt)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const r = d.receipt;
        if (!r) { toast("Could not load that sale for editing", "error"); return; }
        setCart(
          (r.items as { slug?: string; sku?: string; name: string; size: string; color: string; quantity: number; unitPrice: number }[])
            .map((item) => {
              const product = products.find((p) => p.slug === item.slug);
              return {
                slug: item.slug || "",
                sku: item.sku || product?.sku || "",
                name: item.name,
                price: item.unitPrice,
                stock: (product?.stock ?? 0) + item.quantity,
                sizes: product?.sizes ?? [],
                colors: product?.colors ?? [],
                size: item.size || "",
                color: item.color || "",
                quantity: item.quantity,
                weightKg: product?.weightKg ?? 0,
              };
            })
        );
        setCustomerName(r.customerName === "Walk-in Customer" ? "" : r.customerName || "");
        setCustomerPhone(r.customerPhone || "");
        setDiscountAmount(String(r.discountAmount || 0));
        const rate = r.subtotal - r.discountAmount > 0 ? (r.taxAmount / (r.subtotal - r.discountAmount)) * 100 : 0;
        setTaxRate(rate ? String(Math.round(rate * 100) / 100) : "0");
        if (r.fulfillmentType === "delivery") {
          setFulfillmentType("delivery");
          setDeliveryAddress(r.deliveryAddress || "");
          setDeliveryCity(r.deliveryCity || "");
        }
      })
      .catch(() => toast("Could not load that sale for editing", "error"))
      .finally(() => setLoadingEdit(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editReceipt, products.length]);

  useEffect(() => {
    const q = customerSearch.trim();
    if (!customerMenuOpen || selectedCustomerId || !q) {
      setCustomerResults([]);
      setCustomerSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const response = await fetch(`/api/pos/customers?q=${encodeURIComponent(q)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.ok) setCustomerResults(data.customers ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setCustomerResults([]);
      } finally {
        if (!controller.signal.aborted) setCustomerSearching(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerSearch, customerMenuOpen, selectedCustomerId]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setDeliveryAddress([customer.addressLine1, customer.addressLine2].filter(Boolean).join(", "));
    setDeliveryCity(customer.city);
    setDeliveryDistrict(customer.district);
    setDeliveryProvince(customer.province);
    setDeliveryPostalCode(customer.postalCode);
    setCustomerResults([]);
    setCustomerMenuOpen(false);
  };

  const saveNewCustomer = async () => {
    setAddingCustomer(true);
    try {
      const response = await fetch("/api/pos/customers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCustomer),
      });
      const data = await response.json();
      if (!response.ok) { toast(data.error || "Could not add customer"); return; }
      selectCustomer(data.customer);
      setNewCustomer({ name: "", phone: "", address: "", province: "", district: "", city: "", postalCode: "" });
      setAddCustomerOpen(false);
      toast("Customer added");
    } finally { setAddingCustomer(false); }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const discount = Math.min(Math.max(0, Number(discountAmount) || 0), subtotal);
  const taxable = subtotal - discount;
  const rate = Math.max(0, Number(taxRate) || 0);
  const tax = Math.round(taxable * (rate / 100) * 100) / 100;
  const total = Math.round((taxable + tax + (fulfillmentType === "delivery" ? deliveryFee : 0)) * 100) / 100;

  // Weight-based delivery fee is computed server-side (admin-configured pricing).
  useEffect(() => {
    if (fulfillmentType !== "delivery" || cart.length === 0) {
      setDeliveryFee(0);
      return;
    }
    let cancelled = false;
    fetch("/api/shipping/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.map((l) => ({ slug: l.slug, quantity: l.quantity })) }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDeliveryFee(Number(d.shipping) || 0); })
      .catch(() => { if (!cancelled) setDeliveryFee(0); });
    return () => { cancelled = true; };
  }, [cart, fulfillmentType]);
  const deliveryDetailsComplete = Boolean(
    customerName.trim() && customerPhone.trim() && deliveryProvince && deliveryDistrict && deliveryCity && deliveryAddress.trim()
  );
  const fullDeliveryAddress = [deliveryAddress.trim(), deliveryDistrict, deliveryProvince, deliveryPostalCode.trim()].filter(Boolean).join(", ");
  const paymentDisabled = completing || cart.length === 0 || (fulfillmentType === "delivery" && !deliveryDetailsComplete);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast("Fullscreen is not available in this browser");
    }
  };

  const saveDeliveryDetails = () => {
    if (!deliveryDetailsComplete) {
      toast("Enter the customer, phone, province, district, city and address");
      return;
    }
    setFulfillmentType("delivery");
    setDeliveryModalOpen(false);
  };

  const addToCart = (p: Product) => {
    const size = p.sizes[0] ?? "";
    const color = p.colors[0] ?? "";
    setCart((prev) => {
      const totalForProduct = prev.filter((l) => l.slug === p.slug).reduce((sum, l) => sum + l.quantity, 0);
      if (totalForProduct >= p.stock) { toast(`Only ${p.stock} in stock`); return prev; }
      const existing = prev.find((l) => l.slug === p.slug && l.size === size && l.color === color);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, {
        slug: p.slug, sku: p.sku, name: p.name, price: p.price, stock: p.stock,
        sizes: p.sizes, colors: p.colors, size, color, quantity: 1, weightKg: p.weightKg,
      }];
    });
  };

  const updateVariant = (idx: number, field: "size" | "color", value: string) => {
    setCart((prev) => prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line)));
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const line = prev[idx];
      if (!line) return prev;
      const otherQuantity = prev.reduce((sum, item, i) => sum + (i !== idx && item.slug === line.slug ? item.quantity : 0), 0);
      const maxForLine = Math.max(0, line.stock - otherQuantity);
      return prev
        .map((item, i) => (i === idx ? { ...item, quantity: Math.min(maxForLine, Math.max(0, item.quantity + delta)) } : item))
        .filter((item) => item.quantity > 0);
    });
  };

  const removeLine = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const resetSale = () => {
    setCart([]);
    setDiscountAmount("0");
    setTaxRate("0");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerMenuOpen(false);
    setSelectedCustomerId(null);
    setFulfillmentType("pickup");
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryProvince("");
    setDeliveryDistrict("");
    setDeliveryPostalCode("");
    setDeliveryModalOpen(false);
  };

  const completeSale = async () => {
    if (cart.length === 0) return;
    if (fulfillmentType === "delivery" && !deliveryDetailsComplete) { toast("Complete the delivery customer details first"); return; }
    setCompleting(true);
    try {
      const res = await fetch(editReceipt ? `/api/pos/sales/${encodeURIComponent(editReceipt)}` : "/api/pos/sales", {
        method: editReceipt ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({ slug: l.slug, size: l.size, color: l.color, quantity: l.quantity })),
          customerName, customerPhone, discountAmount: discount, taxRate: rate,
          fulfillmentType, deliveryAddress: fulfillmentType === "delivery" ? fullDeliveryAddress : "", deliveryCity,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error || (editReceipt ? "Could not update sale" : "Could not complete sale"), "error"); return; }
      if (editReceipt) {
        toast("Sale updated");
        router.push("/admin/pos/sales");
        return;
      }
      setReceipt(d.receipt);
      resetSale();
      fetch("/api/admin/products", { cache: "no-store" }).then((r) => r.json())
        .then((dd) => setProducts((dd.products ?? []).map((p: any) => ({
          slug: p.slug, sku: p.sku, name: p.name, price: p.price, stock: p.stock,
          image: p.image, sizes: p.sizes ?? [], colors: p.colors ?? [],
        }))));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f5f6f8] p-4 pb-24">
      {editReceipt && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-[#f5851f]/30 bg-[#fff4e8] px-4 py-2.5 text-sm">
          <span className="font-semibold text-[#9a4a0c]">
            Editing sale #{editReceipt}{loadingEdit ? " — loading…" : ""}
          </span>
          <button
            onClick={() => router.push("/admin/pos/sales")}
            className="text-xs font-semibold text-[#9a4a0c] hover:underline"
          >
            Cancel edit
          </button>
        </div>
      )}
      <div className="flex h-[74px] items-center justify-between gap-4 rounded-xl border border-[#e5e7eb] bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="relative hidden w-[290px] md:block">
          <div className={`flex items-center rounded-lg border bg-[#f9fafb] px-3 ${customerMenuOpen ? "border-[#f5851f]" : "border-[#d9d9d9]"}`}>
            <CustomerIcon />
            <input
              value={customerSearch}
              onFocus={() => setCustomerMenuOpen(true)}
              onBlur={() => window.setTimeout(() => setCustomerMenuOpen(false), 150)}
              onChange={(event) => {
                const value = event.target.value;
                setCustomerSearch(value);
                setCustomerName(value);
                setSelectedCustomerId(null);
                setCustomerMenuOpen(true);
              }}
              placeholder="Search / Select Customer"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
            />
            {selectedCustomerId && <span title="Existing customer selected" className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
          </div>
          {customerMenuOpen && customerSearch.trim() && !selectedCustomerId && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-72 w-[360px] overflow-y-auto rounded-xl border border-[#e5e7eb] bg-white p-1.5 shadow-xl">
              {customerSearching ? (
                <p className="px-3 py-4 text-center text-xs text-[#6b7280]">Searching customers...</p>
              ) : customerResults.length ? customerResults.map((customer) => (
                <button key={customer.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCustomer(customer)} className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2.5 text-left hover:bg-[#fff7ed]">
                  <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#1f2937]">{customer.name}</span><span className="block truncate text-xs text-[#6b7280]">{customer.email}</span></span>
                  <span className="shrink-0 pt-0.5 text-xs text-[#6b7280]">{customer.phone || "No phone"}</span>
                </button>
              )) : (
                <p className="px-3 py-4 text-center text-xs text-[#6b7280]">No existing customers found</p>
              )}
            </div>
          )}
        </div>

        <div className="flex max-w-sm flex-1 items-center rounded-lg border border-[#d9d9d9] bg-[#f9fafb] px-3 focus-within:border-[#f5851f]">
          <PosSearchIcon />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Products..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setAddCustomerOpen(true)} aria-label="Add customer" title="Add customer" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] hover:bg-[#fff4e8] hover:text-[#f5851f]"><AddCustomerIcon /></button>
          <button onClick={() => router.push("/admin/pos/sales")} aria-label="Sales history" className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] sm:flex"><ReceiptIcon /></button>
          <button onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] sm:flex"><FullscreenIcon /></button>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2937] text-xs font-bold text-white">
            {(user?.name || "Admin").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-4 grid h-[calc(100vh-182px)] items-stretch gap-4 lg:grid-cols-[40%_60%]">
        <section className="order-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#111827]">Available Products</h1>
          </div>
          <div className="mt-5 grid h-[calc(100%-48px)] grid-cols-2 content-start gap-4 overflow-y-auto pr-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className="group flex h-[396px] flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="h-60 w-full shrink-0 overflow-hidden bg-[#f3f4f6] p-2">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#9ca3af]">No image</div>
                  )}
                </div>
                <div className="flex min-h-[156px] flex-1 flex-col p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#374151]">{p.name}</p>
                  <p className="mt-2 text-xs text-[#9ca3af]">SKU : {p.sku || "—"}</p>
                  <p className="mt-2 text-xs text-[#6b7280]">{p.stock} Pcs</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <p className="font-bold text-[#ff8746]">{formatPrice(p.price)}</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff8746] text-xl font-light text-white transition group-hover:bg-[#f5851f]">+</span>
                  </div>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-navy-800/50">No products found</p>
            )}
          </div>
        </section>

        <aside className="order-1 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff4e8] text-[#f5851f]"><CartIcon /></span>
              <div>
                <p className="font-bold text-[#1f2937]">Current Order</p>
                <p className="text-xs text-[#6b7280]">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
              </div>
            </div>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-semibold text-red-500 hover:text-red-600">Clear</button>}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff7ed] text-[#f5851f]"><CartIcon /></span>
                <p className="mt-4 text-sm font-semibold text-[#4b5563]">Your order is empty</p>
                <p className="mt-1 max-w-52 text-xs leading-5 text-[#9ca3af]">Select a product from Available Products to build the current order</p>
              </div>
            ) : (
              cart.map((l, idx) => (
                <div key={idx} className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#374151]">{l.name}</p>
                    <p className="text-xs text-[#6b7280]">{formatPrice(l.price)} each</p>
                    {(l.sizes.length > 0 || l.colors.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {l.sizes.length > 0 && (
                          <select
                            value={l.size}
                            onChange={(e) => updateVariant(idx, "size", e.target.value)}
                            aria-label={`Size for ${l.name}`}
                            className="rounded-md border border-[#d1d5db] bg-white px-2 py-1 text-xs text-[#374151]"
                          >
                            {l.sizes.map((size) => <option key={size} value={size}>Size: {size}</option>)}
                          </select>
                        )}
                        {l.colors.length > 0 && (
                          <select
                            value={l.color}
                            onChange={(e) => updateVariant(idx, "color", e.target.value)}
                            aria-label={`Colour for ${l.name}`}
                            className="rounded-md border border-[#d1d5db] bg-white px-2 py-1 text-xs text-[#374151]"
                          >
                            {l.colors.map((color) => <option key={color} value={color}>Colour: {color}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => removeLine(idx)} aria-label={`Remove ${l.name}`} className="text-lg leading-none text-[#9ca3af] hover:text-red-500">×</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-lg border border-[#d1d5db] bg-white">
                      <button onClick={() => updateQty(idx, -1)} className="h-8 w-8 text-[#6b7280] hover:bg-[#f3f4f6]">−</button>
                      <span className="w-8 text-center font-semibold text-[#374151]">{l.quantity}</span>
                      <button onClick={() => updateQty(idx, 1)} className="h-8 w-8 text-[#6b7280] hover:bg-[#f3f4f6]">+</button>
                    </div>
                    <p className="font-bold text-[#1f2937]">{formatPrice(l.price * l.quantity)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 border-t border-[#e5e7eb] bg-white px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Discount (LKR)</label>
              <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Tax %</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Customer name</label>
              <input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerSearch(e.target.value); setSelectedCustomerId(null); }} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Phone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-xl bg-[#f9fafb] p-4 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`-${formatPrice(discount)}`} />}
            {tax > 0 && <Row label="Tax" value={formatPrice(tax)} />}
            {fulfillmentType === "delivery" && <Row label="Delivery" value={formatPrice(deliveryFee)} />}
            <div className="border-t border-[#e5e7eb] pt-2"><Row label="Total" value={formatPrice(total)} bold /></div>
          </div>

          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex h-20 items-center justify-between gap-4 border-t border-[#e5e7eb] bg-white px-4 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")} className="rounded-lg border border-[#d1d5db] px-6 py-2.5 text-sm font-semibold text-[#6b7280] hover:bg-[#f9fafb]">Home</button>
          <button onClick={resetSale} className="rounded-lg border border-[#d1d5db] px-6 py-2.5 text-sm font-semibold text-[#6b7280] hover:bg-[#f9fafb]">Reset</button>
          <button onClick={() => router.push("/admin/pos/sales")} className="hidden rounded-lg border border-[#d1d5db] px-6 py-2.5 text-sm font-semibold text-[#6b7280] hover:bg-[#f9fafb] sm:block">Recent Sales</button>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={() => {
              if (fulfillmentType === "delivery") setFulfillmentType("pickup");
              else setDeliveryModalOpen(true);
            }}
            className="hidden items-center gap-2 text-sm font-semibold text-[#4b5563] md:flex"
          >
            <span className={`h-5 w-5 rounded border-2 ${fulfillmentType === "delivery" ? "border-[#f5851f] bg-[#f5851f]" : "border-[#d1d5db] bg-white"}`}>
              {fulfillmentType === "delivery" && <span className="block text-center text-xs leading-4 text-white">✓</span>}
            </span>
            Delivery
          </button>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-[#9ca3af]">Total Payable</p>
            <p className="text-2xl font-bold text-[#ff8746]">{formatPrice(total)}</p>
          </div>
          <button
            onClick={completeSale}
            disabled={paymentDisabled}
            className="min-w-36 rounded-lg bg-[#ff8746] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#f5851f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completing
              ? (editReceipt ? "Saving…" : "Processing…")
              : editReceipt
                ? "Save Changes"
                : fulfillmentType === "delivery" ? "Delivery Now" : "Pay Now"}
          </button>
        </div>
      </div>

      {addCustomerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={() => setAddCustomerOpen(false)}>
          <div className="w-full max-w-[600px] rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-[#252525]">Add Customer</h2>
            <div className="mt-5 space-y-5">
              <DeliveryField label="Full Name">
                <input value={newCustomer.name} onChange={(event) => setNewCustomer((customer) => ({ ...customer, name: event.target.value }))} className="delivery-input" placeholder="Enter Full Name" maxLength={150} />
              </DeliveryField>
              <DeliveryField label="Phone Number">
                <input value={newCustomer.phone} onChange={(event) => setNewCustomer((customer) => ({ ...customer, phone: event.target.value.replace(/[^0-9+]/g, "") }))} className="delivery-input" placeholder="Enter Phone Number" inputMode="tel" />
              </DeliveryField>
              <DeliveryField label="Address">
                <input value={newCustomer.address} onChange={(event) => setNewCustomer((customer) => ({ ...customer, address: event.target.value }))} className="delivery-input" placeholder="Enter Address" maxLength={255} />
              </DeliveryField>
              <div className="grid gap-4 sm:grid-cols-2">
                <DeliveryField label="City">
                  <select value={newCustomer.city} disabled={!newCustomer.district} onChange={(event) => setNewCustomer((customer) => ({ ...customer, city: event.target.value }))} className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#9ca3af]">
                    <option value="">{newCustomer.district ? "Select City" : "Select district first"}</option>
                    {newCustomer.province && newCustomer.district && SRI_LANKA_LOCATIONS[newCustomer.province][newCustomer.district].map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="Province">
                  <select value={newCustomer.province} onChange={(event) => setNewCustomer((customer) => ({ ...customer, province: event.target.value, district: "", city: "" }))} className="delivery-input">
                    <option value="">Select Province</option>
                    {Object.keys(SRI_LANKA_LOCATIONS).map((province) => <option key={province} value={province}>{province}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="District">
                  <select value={newCustomer.district} disabled={!newCustomer.province} onChange={(event) => setNewCustomer((customer) => ({ ...customer, district: event.target.value, city: "" }))} className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#9ca3af]">
                    <option value="">{newCustomer.province ? "Select District" : "Select province first"}</option>
                    {newCustomer.province && Object.keys(SRI_LANKA_LOCATIONS[newCustomer.province]).map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="ZIP Code">
                  <input value={newCustomer.postalCode} onChange={(event) => setNewCustomer((customer) => ({ ...customer, postalCode: event.target.value.replace(/[^0-9]/g, "").slice(0, 5) }))} className="delivery-input" placeholder="Enter ZIP Code" inputMode="numeric" />
                </DeliveryField>
              </div>
            </div>
            <div className="mt-7 flex justify-end gap-5">
              <button type="button" onClick={() => setAddCustomerOpen(false)} className="px-2 py-3 text-sm font-semibold text-[#ff7426]">Cancel</button>
              <button type="button" onClick={saveNewCustomer} disabled={addingCustomer} className="rounded-lg bg-[#ff8746] px-6 py-3 text-sm font-bold text-white hover:bg-[#f5851f] disabled:opacity-50">{addingCustomer ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setDeliveryModalOpen(false)}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-center text-xl font-bold text-[#1f2937]">Delivery Customer Details</h2>

            <div className="mt-5 rounded-xl bg-[#f7f8fa] p-6">
              <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
                <DeliveryField label="Customer Name">
                  <input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerSearch(e.target.value); setSelectedCustomerId(null); }} className="delivery-input" />
                </DeliveryField>
                <DeliveryField label="Phone Number">
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+]/g, ""))} className="delivery-input" />
                </DeliveryField>
                <DeliveryField label="Province">
                  <select
                    value={deliveryProvince}
                    onChange={(e) => {
                      setDeliveryProvince(e.target.value);
                      setDeliveryDistrict("");
                      setDeliveryCity("");
                    }}
                    className="delivery-input"
                  >
                    <option value="">Select Province</option>
                    {Object.keys(SRI_LANKA_LOCATIONS).map((province) => <option key={province} value={province}>{province}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="District">
                  <select
                    value={deliveryDistrict}
                    disabled={!deliveryProvince}
                    onChange={(e) => {
                      setDeliveryDistrict(e.target.value);
                      setDeliveryCity("");
                    }}
                    className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                  >
                    <option value="">{deliveryProvince ? "Select District" : "Select province first"}</option>
                    {deliveryProvince && Object.keys(SRI_LANKA_LOCATIONS[deliveryProvince]).map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="City">
                  <select
                    value={deliveryCity}
                    disabled={!deliveryDistrict}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                  >
                    <option value="">{deliveryDistrict ? "Select City" : "Select district first"}</option>
                    {deliveryProvince && deliveryDistrict && SRI_LANKA_LOCATIONS[deliveryProvince][deliveryDistrict].map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="Postal Code (Optional)">
                  <input value={deliveryPostalCode} onChange={(e) => setDeliveryPostalCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} className="delivery-input" />
                </DeliveryField>
                <div className="md:col-span-2">
                  <DeliveryField label="Address Line">
                    <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="delivery-input min-h-20 resize-none" />
                  </DeliveryField>
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button onClick={() => setDeliveryModalOpen(false)} className="rounded-lg border border-[#d1d5db] px-6 py-3 text-sm font-semibold text-[#6b7280] hover:bg-[#f9fafb]">Cancel</button>
              <button onClick={saveDeliveryDetails} className="rounded-lg bg-[#ff8746] px-6 py-3 text-sm font-bold text-white hover:bg-[#f5851f]">Save Details</button>
            </div>
          </div>
        </div>
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function PosSearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-[#9ca3af]">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function DeliveryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#374151]">{label}</span>
      {children}
    </label>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1" />
      <circle cx="19" cy="20" r="1" />
      <path d="M3 4h2l2.5 11h10l2-7H7" />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-[#9ca3af]">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function AddCustomerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="4" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </svg>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold text-navy-800" : "text-navy-800/70"} ${tone ?? ""}`}>
      <span>{label}</span>
      <span className={tone}>{value}</span>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4 print:static print:bg-transparent print:p-0" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <POSReceiptBill receipt={receipt} />
        <div className="flex justify-end gap-3 px-6 pb-8 print:hidden">
          <button onClick={onClose} className="btn-outline">New Sale</button>
          <button onClick={() => window.print()} className="btn-primary">Print</button>
        </div>
      </div>
    </div>
  );
}
