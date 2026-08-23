"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/ToastProvider";
import { useAuth } from "@/context/AuthProvider";
import POSReceiptBill from "@/components/POSReceiptBill";

interface ProductVariant {
  id: number;
  sku: string;
  attributeSummary: string;
  price: number;
  salePrice: number | null;
  wholesalePrice: number | null;
  stock: number;
  image: string | null;
}

const VARIANT_GROUP_LABELS = ["Size", "Colour"];

function variantTokens(variant: ProductVariant): string[] {
  return variant.attributeSummary.split(" / ").map((value) => value.trim()).filter(Boolean);
}

function variantOptionGroups(variants: ProductVariant[]): string[][] {
  const groupCount = Math.max(0, ...variants.map((variant) => variantTokens(variant).length));
  const groups = Array.from({ length: groupCount }, () => [] as string[]);
  variants.forEach((variant) => variantTokens(variant).forEach((value, index) => {
    if (!groups[index].includes(value)) groups[index].push(value);
  }));
  return groups;
}

function colourSwatch(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    navy: "#172554", cream: "#fff7e6", beige: "#d6c6a8", maroon: "#7f1d1d",
    olive: "#6b7b32", charcoal: "#374151", grey: "#9ca3af", gray: "#9ca3af",
  };
  return aliases[normalized] ?? normalized;
}

interface Product {
  slug: string;
  sku: string;
  name: string;
  price: number;
  salePrice: number | null;
  wholesalePrice: number | null;
  stock: number;
  image: string | null;
  sizes: string[];
  colors: string[];
  weightKg: number;
  productType: "simple" | "variable";
  variants: ProductVariant[];
}

interface CartLine {
  slug: string;
  variantId: number | null;
  sku: string;
  name: string;
  image: string | null;
  variation: string;
  price: number;
  wholesalePrice: number | null;
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
  city: string; district: string; province: string; postalCode: string; isWholesaleCustomer: boolean;
}

interface CourierOption { id: number; name: string; }

interface Receipt {
  receiptNumber: string;
  items: { slug?: string; variantId?: number | null; name: string; sku?: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }[];
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

function mapProduct(p: any): Product {
  return {
    slug: p.slug, sku: p.sku, name: p.name, price: Number(p.price), salePrice: p.salePrice == null ? null : Number(p.salePrice),
    wholesalePrice: p.wholesalePrice == null ? null : Number(p.wholesalePrice), stock: p.stock,
    image: p.image, sizes: p.sizes ?? [], colors: p.colors ?? [], weightKg: Number(p.weightKg) || 0,
    productType: p.productType === "variable" ? "variable" : "simple",
    variants: (p.variants ?? []).map((v: any) => ({
      id: v.id, sku: v.sku, attributeSummary: v.attributeSummary, price: Number(v.price), salePrice: v.salePrice == null ? null : Number(v.salePrice),
      wholesalePrice: v.wholesalePrice == null ? null : Number(v.wholesalePrice), stock: Number(v.stock), image: v.image ?? null,
    })),
  };
}

/** Wholesale price applies only for a selected customer flagged as wholesale, and only when it actually undercuts the regular/sale price. */
function effectiveLinePrice(line: Pick<CartLine, "price" | "wholesalePrice">, customerWholesale: boolean): number {
  return customerWholesale && line.wholesalePrice != null && line.wholesalePrice > 0 && line.wholesalePrice < line.price
    ? line.wholesalePrice
    : line.price;
}

function PosPrice({ regularPrice, salePrice, compact = false }: { regularPrice: number; salePrice: number | null; compact?: boolean }) {
  if (salePrice == null) {
    return <p className="font-bold text-[#ff8746]">{formatPrice(regularPrice)}</p>;
  }
  return (
    <div className={compact ? "leading-tight" : "text-right leading-tight"}>
      <p className="text-xs font-medium text-[#9ca3af] line-through">Regular {formatPrice(regularPrice)}</p>
      <p className={compact ? "mt-1 font-bold text-[#ff8746]" : "mt-1 text-2xl font-bold text-[#ff7426]"}>
        Selling {formatPrice(salePrice)}
      </p>
    </div>
  );
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
  const { user, logout } = useAuth();
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
  const [customerPhone2, setCustomerPhone2] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerWholesale, setCustomerWholesale] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "", district: "", city: "", postalCode: "" });
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [deliveryDistrictId, setDeliveryDistrictId] = useState(0);
  const [deliveryCityId, setDeliveryCityId] = useState(0);
  const [courierDistricts, setCourierDistricts] = useState<CourierOption[]>([]);
  const [deliveryCities, setDeliveryCities] = useState<CourierOption[]>([]);
  const [newCustomerDistrictId, setNewCustomerDistrictId] = useState(0);
  const [newCustomerCities, setNewCustomerCities] = useState<CourierOption[]>([]);
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editReceipt));

  const loadProducts = () =>
    fetch("/api/admin/products?view=pos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProducts((d.products ?? []).map(mapProduct)));

  useEffect(() => { loadProducts(); }, []);
  useEffect(() => {
    fetch("/api/locations", { cache: "no-store" }).then((r) => r.json()).then((data) => setCourierDistricts(data.districts ?? [])).catch(() => toast("Courier locations could not be loaded", "error"));
  }, [toast]);

  const loadCourierCities = async (districtId: number, target: "delivery" | "customer") => {
    const response = await fetch(`/api/locations?districtId=${districtId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { toast(data.error || "Cities could not be loaded", "error"); return; }
    if (target === "delivery") setDeliveryCities(data.cities ?? []);
    else setNewCustomerCities(data.cities ?? []);
  };

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
          (r.items as { slug?: string; variantId?: number | null; sku?: string; name: string; size: string; color: string; quantity: number; unitPrice: number }[])
            .map((item) => {
              const product = products.find((p) => p.slug === item.slug);
              const variant = item.variantId ? product?.variants.find((v) => v.id === item.variantId) : undefined;
              return {
                slug: item.slug || "",
                variantId: item.variantId ?? null,
                sku: item.sku || variant?.sku || product?.sku || "",
                name: item.name,
                image: variant?.image || product?.image || null,
                variation: variant?.attributeSummary || [item.size, item.color].filter(Boolean).join(" / "),
                price: item.unitPrice,
                wholesalePrice: variant?.wholesalePrice ?? product?.wholesalePrice ?? null,
                stock: (variant?.stock ?? product?.stock ?? 0) + item.quantity,
                sizes: [],
                colors: [],
                size: item.size || "",
                color: item.color || "",
                quantity: item.quantity,
                weightKg: product?.weightKg ?? 0,
              };
            })
        );
        setCustomerName(r.customerName === "Walk-in Customer" ? "" : r.customerName || "");
        setCustomerPhone(r.customerPhone || "");
        setCustomerPhone2(r.customerPhone2 || "");
        setSelectedCustomerId(r.customerId ? `user-${r.customerId}` : null);
        setCustomerWholesale(!!r.customerIsWholesaleCustomer);
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

  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerWholesale(customer.isWholesaleCustomer);
    setCustomerSearch(customer.name);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerPhone2("");
    setDeliveryAddress([customer.addressLine1, customer.addressLine2].filter(Boolean).join(", "));
    setDeliveryCity(customer.city);
    setDeliveryDistrict(customer.district);
    setDeliveryPostalCode(customer.postalCode);
    setCustomerResults([]);
    setCustomerMenuOpen(false);
    const district = courierDistricts.find((item) => item.name.toLowerCase() === customer.district.toLowerCase());
    if (district) {
      setDeliveryDistrictId(district.id);
      const response = await fetch(`/api/locations?districtId=${district.id}`, { cache: "no-store" });
      const data = await response.json();
      const loadedCities: CourierOption[] = data.cities ?? [];
      setDeliveryCities(loadedCities);
      setDeliveryCityId(loadedCities.find((item) => item.name.toLowerCase() === customer.city.toLowerCase())?.id ?? 0);
    }
  };

  const saveNewCustomer = async () => {
    setAddingCustomer(true);
    try {
      const response = await fetch("/api/pos/customers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCustomer),
      });
      const data = await response.json();
      if (!response.ok) { toast(data.error || "Could not add customer"); return; }
      await selectCustomer(data.customer);
      setNewCustomer({ name: "", phone: "", address: "", district: "", city: "", postalCode: "" });
      setNewCustomerDistrictId(0);
      setNewCustomerCities([]);
      setAddCustomerOpen(false);
      toast("Customer added");
    } finally { setAddingCustomer(false); }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const subtotal = cart.reduce((s, l) => s + effectiveLinePrice(l, customerWholesale) * l.quantity, 0);
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
    customerName.trim() && customerPhone.trim() && deliveryDistrictId && deliveryCityId && deliveryAddress.trim()
  );
  const fullDeliveryAddress = [deliveryAddress.trim(), deliveryDistrict, deliveryCity, deliveryPostalCode.trim()].filter(Boolean).join(", ");
  const paymentDisabled = completing || cart.length === 0 || (fulfillmentType === "delivery" && !deliveryDetailsComplete);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast("Fullscreen is not available in this browser");
    }
  };

  const handleLogout = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      toast("Could not sign out. Please try again.", "error");
    }
  };

  const saveDeliveryDetails = () => {
    if (!deliveryDetailsComplete) {
      toast("Enter the customer, phone, district, city and address");
      return;
    }
    setFulfillmentType("delivery");
    setDeliveryModalOpen(false);
  };

  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<string[]>([]);
  const selectedPickerVariant = variantPickerProduct?.variants.find(
    (variant) => variant.attributeSummary === selectedVariantOptions.join(" / ")
  );

  const addLineToCart = (p: Product, variant: ProductVariant | null) => {
    const options = variant ? variantTokens(variant) : [];
    const size = options[0] || "";
    const color = options[1] || "";
    const stock = variant?.stock ?? p.stock;
    const price = variant ? (variant.salePrice ?? variant.price) : (p.salePrice ?? p.price);
    const wholesalePrice = variant ? variant.wholesalePrice : p.wholesalePrice;
    const sku = variant?.sku || p.sku;
    setCart((prev) => {
      const totalForLine = prev
        .filter((l) => l.slug === p.slug && l.variantId === (variant?.id ?? null))
        .reduce((sum, l) => sum + l.quantity, 0);
      if (totalForLine >= stock) { toast(`Only ${stock} in stock`); return prev; }
      const existing = prev.find((l) => l.slug === p.slug && l.variantId === (variant?.id ?? null) && l.size === size && l.color === color);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, {
        slug: p.slug, variantId: variant?.id ?? null, sku, name: p.name,
        image: variant?.image || p.image, variation: variant?.attributeSummary || "", price, wholesalePrice, stock,
        sizes: [], colors: [], size, color, quantity: 1, weightKg: p.weightKg,
      }];
    });
  };

  const addToCart = (p: Product) => {
    if (p.productType === "variable") {
      setVariantPickerProduct(p);
      const firstAvailable = p.variants.find((variant) => variant.stock > 0) ?? p.variants[0];
      setSelectedVariantOptions(firstAvailable ? variantTokens(firstAvailable) : []);
      return;
    }
    addLineToCart(p, null);
  };

  const updateVariant = (idx: number, field: "size" | "color", value: string) => {
    setCart((prev) => prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line)));
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const line = prev[idx];
      if (!line) return prev;
      const otherQuantity = prev.reduce(
        (sum, item, i) => sum + (i !== idx && item.slug === line.slug && item.variantId === line.variantId ? item.quantity : 0),
        0
      );
      const maxForLine = Math.max(0, line.stock - otherQuantity);
      return prev
        .map((item, i) => (i === idx ? { ...item, quantity: Math.min(maxForLine, Math.max(0, item.quantity + delta)) } : item))
        .filter((item) => item.quantity > 0);
    });
  };

  const setQty = (idx: number, quantity: number) => {
    if (!Number.isFinite(quantity)) return;
    setCart((prev) => {
      const line = prev[idx];
      if (!line) return prev;
      const otherQuantity = prev.reduce(
        (sum, item, i) => sum + (i !== idx && item.slug === line.slug && item.variantId === line.variantId ? item.quantity : 0),
        0
      );
      const maxForLine = Math.max(1, line.stock - otherQuantity);
      const nextQuantity = Math.min(maxForLine, Math.max(1, Math.floor(quantity)));
      return prev.map((item, i) => (i === idx ? { ...item, quantity: nextQuantity } : item));
    });
  };

  const removeLine = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const resetSale = () => {
    setCart([]);
    setDiscountAmount("0");
    setTaxRate("0");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerPhone2("");
    setCustomerSearch("");
    setCustomerResults([]);
    setCustomerMenuOpen(false);
    setSelectedCustomerId(null); setCustomerWholesale(false);
    setFulfillmentType("pickup");
    setDeliveryAddress("");
    setDeliveryCity("");
    setDeliveryDistrict("");
    setDeliveryDistrictId(0);
    setDeliveryCityId(0);
    setDeliveryCities([]);
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
          items: cart.map((l) => ({ slug: l.slug, variantId: l.variantId, size: l.size, color: l.color, quantity: l.quantity })),
          customerId: selectedCustomerId ? Number(selectedCustomerId.replace(/^user-/, "")) : null,
          customerName, customerPhone, customerPhone2, discountAmount: discount, taxRate: rate,
          fulfillmentType, deliveryAddress: fulfillmentType === "delivery" ? fullDeliveryAddress : "", deliveryDistrict, deliveryDistrictId, deliveryCity, deliveryCityId,
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
      loadProducts();
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
                setSelectedCustomerId(null); setCustomerWholesale(false);
                setCustomerMenuOpen(true);
              }}
              placeholder="Search / Select Customer"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#374151] outline-none placeholder:text-[#9ca3af]"
            />
            {selectedCustomerId && (
              <span
                title={customerWholesale ? "Wholesale customer selected" : "Existing customer selected"}
                className={`h-2.5 w-2.5 rounded-full ${customerWholesale ? "bg-[#f5851f]" : "bg-emerald-500"}`}
              />
            )}
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
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
          >
            <LogoutIcon />
          </button>
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
                  <p className="mt-2 text-xs text-[#6b7280]">{p.stock} Pcs{p.productType === "variable" ? ` · ${p.variants.length} variation${p.variants.length === 1 ? "" : "s"}` : ""}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <div>
                      <PosPrice regularPrice={p.price} salePrice={p.salePrice} compact />
                      {p.productType === "variable" && <p className="mt-0.5 text-[10px] text-[#9ca3af]">Price varies by option</p>}
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff8746] text-xl font-light text-white transition group-hover:bg-[#f5851f]">
                      {p.productType === "variable" ? "…" : "+"}
                    </span>
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
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e5e7eb] bg-white">
                      {l.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image} alt={l.variation ? `${l.name} - ${l.variation}` : l.name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center"><ProductImagePlaceholder /></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#374151]">{l.name}</p>
                      <p className="text-xs text-[#6b7280]">{formatPrice(effectiveLinePrice(l, customerWholesale))} each</p>
                      {customerWholesale && l.wholesalePrice != null && l.wholesalePrice > 0 && l.wholesalePrice < l.price && (
                        <p className="mt-0.5 text-xs font-semibold text-emerald-600">Wholesale price applied</p>
                      )}
                      {l.variantId != null && l.variation && (
                        <p className="mt-1 inline-block rounded-md bg-white px-2 py-1 text-xs font-medium text-[#374151] ring-1 ring-[#e5e7eb]">{l.variation}</p>
                      )}
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
                  </div>
                  <button onClick={() => removeLine(idx)} aria-label={`Remove ${l.name}`} className="text-lg leading-none text-[#9ca3af] hover:text-red-500">×</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden rounded-lg border border-[#d1d5db] bg-white">
                      <button onClick={() => updateQty(idx, -1)} className="h-8 w-8 text-[#6b7280] hover:bg-[#f3f4f6]">−</button>
                      <input
                        type="number"
                        min={1}
                        max={l.stock}
                        value={l.quantity}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => setQty(idx, Number(event.target.value))}
                        aria-label={`Quantity for ${l.name}`}
                        className="h-8 w-12 border-x border-[#d1d5db] bg-white text-center font-semibold text-[#374151] outline-none [appearance:textfield] focus:ring-1 focus:ring-inset focus:ring-[#f5851f] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button onClick={() => updateQty(idx, 1)} className="h-8 w-8 text-[#6b7280] hover:bg-[#f3f4f6]">+</button>
                    </div>
                    <p className="font-bold text-[#1f2937]">{formatPrice(effectiveLinePrice(l, customerWholesale) * l.quantity)}</p>
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
              <input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerSearch(e.target.value); setSelectedCustomerId(null); setCustomerWholesale(false); }} className="input" placeholder="Optional" />
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
                <DeliveryField label="District">
                  <select value={newCustomerDistrictId} onChange={(event) => { const id = Number(event.target.value); const district = courierDistricts.find((item) => item.id === id); setNewCustomerDistrictId(id); setNewCustomer((customer) => ({ ...customer, district: district?.name ?? "", city: "" })); setNewCustomerCities([]); if (id) loadCourierCities(id, "customer"); }} className="delivery-input">
                    <option value="">Select District</option>
                    {courierDistricts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="City">
                  <select value={newCustomer.city} disabled={!newCustomerDistrictId} onChange={(event) => setNewCustomer((customer) => ({ ...customer, city: event.target.value }))} className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f9fafb] disabled:text-[#9ca3af]">
                    <option value="">{newCustomer.district ? "Select City" : "Select district first"}</option>
                    {newCustomerCities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
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

      {variantPickerProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" onClick={() => setVariantPickerProduct(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-8">
              <div className="relative flex min-h-64 overflow-hidden rounded-xl bg-[#f4f4f4] md:min-h-[460px]">
                {(selectedPickerVariant?.image || variantPickerProduct.image) ? (
                  <Image key={selectedPickerVariant?.image || variantPickerProduct.image} src={selectedPickerVariant?.image || variantPickerProduct.image || ""} alt={`${variantPickerProduct.name} ${selectedPickerVariant?.attributeSummary || ""}`} fill sizes="(max-width: 767px) 100vw, 45vw" className="object-cover" priority />
                ) : (
                  <span className="m-auto scale-150"><ProductImagePlaceholder /></span>
                )}
              </div>
              <div className="flex min-w-0 flex-col py-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f5851f]">Select variation</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight text-[#252525]">{variantPickerProduct.name}</h2>
                <p className="mt-2 text-sm text-[#6b7280]">Choose your preferred size and colour.</p>
            <div className="mt-7 space-y-6">
              {variantPickerProduct.variants.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#9ca3af]">No variations available for this product.</p>
              ) : (
                variantOptionGroups(variantPickerProduct.variants).map((values, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex items-center gap-2 text-sm font-bold text-[#374151]">
                      {groupIndex === 0 ? <SizeIcon /> : groupIndex === 1 ? <ColourIcon /> : null}
                      <span>{VARIANT_GROUP_LABELS[groupIndex] ?? `Option ${groupIndex + 1}`}</span>
                      {selectedVariantOptions[groupIndex] && <span className="font-medium text-[#9ca3af]">· {selectedVariantOptions[groupIndex]}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {values.map((value) => {
                        const candidate = selectedVariantOptions.map((option, index) => index === groupIndex ? value : option);
                        const exact = variantPickerProduct.variants.find((variant) => variant.attributeSummary === candidate.join(" / ") && variant.stock > 0);
                        const available = exact ?? variantPickerProduct.variants.find((variant) => variantTokens(variant)[groupIndex] === value && variant.stock > 0);
                        const selected = selectedVariantOptions[groupIndex] === value;
                        return (
                          <button key={value} type="button" disabled={!available}
                            onClick={() => setSelectedVariantOptions(available ? variantTokens(available) : candidate)}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${selected ? "border-[#f5851f] bg-[#fff7ed] text-[#ea580c] ring-2 ring-[#fed7aa]" : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#f5851f]"}`}>
                            {groupIndex === 1 && <span className="h-5 w-5 rounded-full border border-black/15 shadow-inner" style={{ backgroundColor: colourSwatch(value) }} />}
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
            {(() => {
              const selectedVariant = variantPickerProduct.variants.find((variant) => variant.attributeSummary === selectedVariantOptions.join(" / "));
              if (!selectedVariant) return null;
              return <div className="mt-7 border-y border-[#e5e7eb] py-4"><div className="flex items-end justify-between gap-4"><span className="text-sm font-medium text-[#16a34a]">{selectedVariant.stock} in stock</span><PosPrice regularPrice={selectedVariant.price} salePrice={selectedVariant.salePrice} /></div><p className="mt-1 text-xs text-[#9ca3af]">SKU: {selectedVariant.sku || variantPickerProduct.sku}</p></div>;
            })()}
            <div className="mt-auto flex justify-end gap-3 pt-6">
              <button type="button" onClick={() => setVariantPickerProduct(null)} className="px-2 py-3 text-sm font-semibold text-[#ff7426]">Cancel</button>
              <button type="button"
                disabled={!variantPickerProduct.variants.some((variant) => variant.attributeSummary === selectedVariantOptions.join(" / ") && variant.stock > 0)}
                onClick={() => {
                  const variant = variantPickerProduct.variants.find((item) => item.attributeSummary === selectedVariantOptions.join(" / ") && item.stock > 0);
                  if (variant) { addLineToCart(variantPickerProduct, variant); setVariantPickerProduct(null); }
                }}
                className="min-w-36 rounded-lg bg-[#ff8746] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#f5851f] disabled:cursor-not-allowed disabled:opacity-40">Add to cart</button>
            </div>
            </div>
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
                  <input value={customerName} onChange={(e) => { setCustomerName(e.target.value); setCustomerSearch(e.target.value); setSelectedCustomerId(null); setCustomerWholesale(false); }} className="delivery-input" />
                </DeliveryField>
                <DeliveryField label="Phone Number">
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+]/g, ""))} className="delivery-input" />
                </DeliveryField>
                <DeliveryField label="2nd Phone Number">
                  <input value={customerPhone2} onChange={(e) => setCustomerPhone2(e.target.value.replace(/[^0-9+]/g, ""))} className="delivery-input" placeholder="Optional" inputMode="tel" />
                </DeliveryField>
                <DeliveryField label="District">
                  <select
                    value={deliveryDistrictId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const district = courierDistricts.find((item) => item.id === id);
                      setDeliveryDistrictId(id);
                      setDeliveryDistrict(district?.name ?? "");
                      setDeliveryCity("");
                      setDeliveryCityId(0);
                      setDeliveryCities([]);
                      if (id) loadCourierCities(id, "delivery");
                    }}
                    className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                  >
                    <option value={0}>Select District</option>
                    {courierDistricts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                  </select>
                </DeliveryField>
                <DeliveryField label="City">
                  <select
                    value={deliveryCityId}
                    disabled={!deliveryDistrictId}
                    onChange={(e) => { const id = Number(e.target.value); setDeliveryCityId(id); setDeliveryCity(deliveryCities.find((item) => item.id === id)?.name ?? ""); }}
                    className="delivery-input disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
                  >
                    <option value={0}>{deliveryDistrictId ? "Select City" : "Select district first"}</option>
                    {deliveryCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
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

function SizeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5 7.5 3l3 3 3-3L21 7.5l-3 4-2-1V21H8V10.5l-2 1-3-4Z" />
    </svg>
  );
}

function ProductImagePlaceholder() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#9ca3af]" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m4 17 4.5-4.5 3 3 2-2L20 19" />
    </svg>
  );
}

function ColourIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.2-3.15 1.8 1.8 0 0 1 1.2-3.15H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" />
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

function LogoutIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
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
