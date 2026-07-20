"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/context/ToastProvider";

interface Cashier {
  id: number;
  name: string;
  isActive: boolean;
  onShift: boolean;
}

interface Product {
  slug: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  sizes: string[];
  colors: string[];
}

interface CartLine {
  slug: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  size: string;
  color: string;
  quantity: number;
}

interface OpenShift {
  id: number;
  cashierId: number;
  cashierName: string;
  openingFloat: number;
  openedAt: string;
}

interface Receipt {
  receiptNumber: string;
  items: { name: string; size: string; color: string; quantity: number; unitPrice: number; lineTotal: number }[];
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  amountTendered: number | null;
  changeDue: number | null;
  fulfillmentType?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  createdAt: string;
}

type Stage = "select-cashier" | "pin" | "open-float" | "register" | "close-shift";

export default function AdminPosRegisterPage() {
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>("select-cashier");
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shift, setShift] = useState<OpenShift | null>(null);
  const [openingFloat, setOpeningFloat] = useState("0");

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const [closingFloat, setClosingFloat] = useState("");
  const [closeResult, setCloseResult] = useState<{ expectedCash: number; closingFloat: number; cashDifference: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/pos/cashiers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCashiers((d.cashiers ?? []).filter((c: Cashier) => c.isActive)));
  }, []);

  useEffect(() => {
    if (stage === "register") {
      fetch("/api/admin/products", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setProducts((d.products ?? []).map((p: any) => ({
          slug: p.slug, sku: p.sku, name: p.name, price: p.price, stock: p.stock,
          image: p.image, sizes: p.sizes ?? [], colors: p.colors ?? [],
        }))));
    }
  }, [stage]);

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
  const total = Math.round((taxable + tax) * 100) / 100;
  const tendered = Number(amountTendered) || 0;
  const change = paymentMethod === "cash" ? Math.max(0, Math.round((tendered - total) * 100) / 100) : 0;

  const selectCashier = (c: Cashier) => {
    setSelectedCashier(c);
    setPin("");
    setPinError("");
    setStage("pin");
  };

  const submitPin = async (value: string) => {
    if (!selectedCashier || value.length < 4) return;
    setPinError("");
    const res = await fetch("/api/pos/verify-pin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashierId: selectedCashier.id, pin: value }),
    });
    const d = await res.json();
    if (!res.ok) { setPinError(d.error || "Incorrect PIN"); setPin(""); return; }
    if (d.openShift) {
      setShift(d.openShift);
      setStage("register");
    } else {
      setStage("open-float");
    }
  };

  const openShift = async () => {
    if (!selectedCashier) return;
    const res = await fetch("/api/pos/shifts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashierId: selectedCashier.id, openingFloat: Number(openingFloat) || 0 }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error || "Could not open shift"); return; }
    setShift({ id: d.shiftId, cashierId: selectedCashier.id, cashierName: selectedCashier.name, openingFloat: Number(openingFloat) || 0, openedAt: new Date().toISOString() });
    setStage("register");
  };

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.slug === p.slug && !l.size && !l.color);
      if (existing) {
        if (existing.quantity >= p.stock) { toast(`Only ${p.stock} in stock`); return prev; }
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { slug: p.slug, sku: p.sku, name: p.name, price: p.price, stock: p.stock, size: "", color: "", quantity: 1 }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) => prev
      .map((l, i) => (i === idx ? { ...l, quantity: Math.min(l.stock, Math.max(0, l.quantity + delta)) } : l))
      .filter((l) => l.quantity > 0));
  };

  const removeLine = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  const resetSale = () => {
    setCart([]);
    setDiscountAmount("0");
    setTaxRate("0");
    setCustomerName("");
    setCustomerPhone("");
    setFulfillmentType("pickup");
    setDeliveryAddress("");
    setDeliveryCity("");
    setPaymentMethod("cash");
    setAmountTendered("");
  };

  const completeSale = async () => {
    if (!shift || !selectedCashier || cart.length === 0) return;
    if (paymentMethod === "cash" && tendered < total) { toast("Amount tendered is less than total due"); return; }
    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) { toast("Delivery address is required"); return; }
    setCompleting(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shift.id, cashierId: selectedCashier.id,
          items: cart.map((l) => ({ slug: l.slug, size: l.size, color: l.color, quantity: l.quantity })),
          customerName, customerPhone, discountAmount: discount, taxRate: rate,
          paymentMethod, amountTendered: paymentMethod === "cash" ? tendered : undefined,
          fulfillmentType, deliveryAddress, deliveryCity,
        }),
      });
      const d = await res.json();
      if (!res.ok) { toast(d.error || "Could not complete sale"); return; }
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

  const closeShift = async () => {
    if (!shift) return;
    const res = await fetch(`/api/pos/shifts/${shift.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingFloat: Number(closingFloat) || 0 }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error || "Could not close shift"); return; }
    setCloseResult(d);
  };

  const endEverything = () => {
    setShift(null);
    setSelectedCashier(null);
    setCloseResult(null);
    setClosingFloat("");
    resetSale();
    setStage("select-cashier");
    fetch("/api/admin/pos/cashiers", { cache: "no-store" }).then((r) => r.json())
      .then((d) => setCashiers((d.cashiers ?? []).filter((c: Cashier) => c.isActive)));
  };

  if (stage === "select-cashier") {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy-800">POS Register</h1>
        <p className="mt-1 text-sm text-navy-800/50">Select your name to begin.</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cashiers.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCashier(c)}
              className="flex flex-col items-center gap-3 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm hover:border-orange-300 hover:shadow-md"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-800 text-lg font-bold text-white">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-navy-800">{c.name}</span>
              {c.onShift && <span className="badge bg-blue-100 text-blue-700">On shift</span>}
            </button>
          ))}
          {cashiers.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-navy-800/50">
              No active cashiers. Add one under POS → Cashiers.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (stage === "pin") {
    return (
      <div className="mx-auto max-w-xs pt-10 text-center">
        <button onClick={() => setStage("select-cashier")} className="mb-6 text-sm text-navy-800/50 hover:underline">← Back</button>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-800 text-xl font-bold text-white">
          {selectedCashier?.name.charAt(0).toUpperCase()}
        </span>
        <p className="mt-3 text-lg font-bold text-navy-800">{selectedCashier?.name}</p>
        <p className="text-sm text-navy-800/50">Enter your PIN</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
            setPin(v);
            if (v.length >= 4) submitPin(v);
          }}
          className="input mt-4 text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
        />
        {pinError && <p className="mt-3 text-sm text-red-600">{pinError}</p>}
      </div>
    );
  }

  if (stage === "open-float") {
    return (
      <div className="mx-auto max-w-xs pt-10 text-center">
        <p className="text-lg font-bold text-navy-800">Open Shift</p>
        <p className="text-sm text-navy-800/50">Enter the opening cash float for {selectedCashier?.name}</p>
        <input
          type="number"
          value={openingFloat}
          onChange={(e) => setOpeningFloat(e.target.value)}
          className="input mt-4 text-center text-xl"
        />
        <button onClick={openShift} className="btn-primary mt-4 w-full">Start Shift</button>
      </div>
    );
  }

  if (stage === "close-shift") {
    return (
      <div className="mx-auto max-w-sm pt-10">
        <p className="text-lg font-bold text-navy-800">End Shift — {shift?.cashierName}</p>
        {!closeResult ? (
          <>
            <p className="mt-1 text-sm text-navy-800/50">Count the cash drawer and enter the total.</p>
            <input
              type="number"
              autoFocus
              value={closingFloat}
              onChange={(e) => setClosingFloat(e.target.value)}
              className="input mt-4 text-center text-xl"
              placeholder="Closing cash count"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setStage("register")} className="btn-outline flex-1">Cancel</button>
              <button onClick={closeShift} className="btn-primary flex-1" disabled={!closingFloat}>Close Shift</button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <Row label="Expected Cash" value={formatPrice(closeResult.expectedCash)} />
            <Row label="Counted Cash" value={formatPrice(closeResult.closingFloat)} />
            <Row
              label="Difference"
              value={formatPrice(closeResult.cashDifference)}
              tone={closeResult.cashDifference === 0 ? "text-emerald-600" : closeResult.cashDifference > 0 ? "text-blue-600" : "text-red-600"}
            />
            <button onClick={endEverything} className="btn-primary mt-2 w-full">Done</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Register</h1>
          <p className="text-sm text-navy-800/50">Cashier: {shift?.cashierName}</p>
        </div>
        <button onClick={() => setStage("close-shift")} className="btn-outline">End Shift</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU…"
            className="input"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className="flex flex-col overflow-hidden rounded-xl border border-navy-800/5 bg-white text-left shadow-sm hover:border-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="aspect-[4/3] w-full bg-navy-50">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-navy-800/30">No image</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-navy-800">{p.name}</p>
                  <p className="mt-1 text-xs text-navy-800/50">{p.stock} in stock</p>
                  <p className="mt-1 font-bold text-orange-600">{formatPrice(p.price)}</p>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-navy-800/50">No products found</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-navy-800">Cart</p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-navy-800/40">Cart is empty</p>
            ) : (
              cart.map((l, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 border-b border-navy-800/5 pb-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-800">{l.name}</p>
                    <p className="text-xs text-navy-800/50">{formatPrice(l.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(idx, -1)} className="h-6 w-6 rounded bg-navy-50 text-navy-800">−</button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button onClick={() => updateQty(idx, 1)} className="h-6 w-6 rounded bg-navy-50 text-navy-800">+</button>
                  </div>
                  <p className="w-16 text-right font-semibold text-navy-800">{formatPrice(l.price * l.quantity)}</p>
                  <button onClick={() => removeLine(idx)} className="text-red-500">×</button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
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
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Phone</label>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" placeholder="Optional" />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-navy-800/60">Fulfillment</label>
            <div className="flex gap-2">
              <button onClick={() => setFulfillmentType("pickup")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${fulfillmentType === "pickup" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-800"}`}>Walk-in / Pickup</button>
              <button onClick={() => setFulfillmentType("delivery")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${fulfillmentType === "delivery" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-800"}`}>Delivery</button>
            </div>
            {fulfillmentType === "delivery" && (
              <div className="mt-3 space-y-3 rounded-lg bg-navy-50 p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-800/60">Delivery address</label>
                  <input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="input" placeholder="Street address" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-navy-800/60">City</label>
                  <input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} className="input" placeholder="City" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-navy-800/10 pt-3 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`-${formatPrice(discount)}`} />}
            {tax > 0 && <Row label="Tax" value={formatPrice(tax)} />}
            <Row label="Total" value={formatPrice(total)} bold />
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => setPaymentMethod("cash")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${paymentMethod === "cash" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-800"}`}>Cash</button>
            <button onClick={() => setPaymentMethod("card")} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${paymentMethod === "card" ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-800"}`}>Card</button>
          </div>

          {paymentMethod === "cash" && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-navy-800/60">Amount tendered</label>
              <input type="number" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} className="input" />
              {tendered > 0 && (
                <p className="mt-1.5 text-sm text-navy-800/70">Change due: <span className="font-bold text-navy-800">{formatPrice(change)}</span></p>
              )}
            </div>
          )}

          <button
            onClick={completeSale}
            disabled={completing || cart.length === 0 || (paymentMethod === "cash" && tendered < total) || (fulfillmentType === "delivery" && !deliveryAddress.trim())}
            className="btn-primary mt-4 w-full"
          >
            {completing ? "Processing…" : `Complete Sale — ${formatPrice(total)}`}
          </button>
        </div>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl print:shadow-none" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <p className="text-lg font-black tracking-wide text-navy-800">BEYOS</p>
          <p className="text-xs text-navy-800/50">Receipt #{receipt.receiptNumber}</p>
          <p className="text-xs text-navy-800/50">{new Date(receipt.createdAt).toLocaleString("en-GB")}</p>
          <p className="text-xs text-navy-800/50">{receipt.customerName}</p>
          {receipt.fulfillmentType === "delivery" && (
            <p className="mt-1 text-xs font-semibold text-blue-600">FOR DELIVERY</p>
          )}
        </div>

        {receipt.fulfillmentType === "delivery" && (
          <div className="mt-3 rounded-lg bg-navy-50 p-3 text-xs text-navy-800/80">
            <p className="font-semibold text-navy-800">Deliver to:</p>
            <p>{receipt.deliveryAddress}</p>
            {receipt.deliveryCity && <p>{receipt.deliveryCity}</p>}
          </div>
        )}

        <div className="mt-4 space-y-2 border-y border-dashed border-navy-800/20 py-3">
          {receipt.items.map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <p className="text-navy-800">{it.name}</p>
                <p className="text-xs text-navy-800/50">{it.quantity} × {formatPrice(it.unitPrice)}</p>
              </div>
              <p className="font-semibold text-navy-800">{formatPrice(it.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <Row label="Subtotal" value={formatPrice(receipt.subtotal)} />
          {receipt.discountAmount > 0 && <Row label="Discount" value={`-${formatPrice(receipt.discountAmount)}`} />}
          {receipt.taxAmount > 0 && <Row label="Tax" value={formatPrice(receipt.taxAmount)} />}
          <div className="border-t border-navy-800/10 pt-1.5">
            <Row label="Total" value={formatPrice(receipt.total)} bold />
          </div>
          {receipt.paymentMethod === "cash" && receipt.amountTendered !== null && (
            <>
              <Row label="Tendered" value={formatPrice(receipt.amountTendered)} />
              <Row label="Change" value={formatPrice(receipt.changeDue ?? 0)} />
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <button onClick={onClose} className="btn-outline">New Sale</button>
          <button onClick={() => window.print()} className="btn-primary">Print</button>
        </div>
      </div>
    </div>
  );
}
