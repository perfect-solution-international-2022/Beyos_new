"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastProvider";

export default function AdminDeliveryPricingPage() {
  const { toast } = useToast();
  const [basePrice, setBasePrice] = useState("");
  const [extraKgPrice, setExtraKgPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/delivery-pricing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setBasePrice(String(d.pricing.basePrice));
        setExtraKgPrice(String(d.pricing.extraKgPrice));
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/delivery-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: Number(basePrice), extraKgPrice: Number(extraKgPrice) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save delivery pricing");
      toast("Delivery pricing saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save delivery pricing", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-800">Delivery Pricing</h1>
      <p className="mt-1 text-sm text-navy-800/60">
        Applies to customer checkout, reseller orders, and POS delivery orders. Order weight
        is the sum of each product&apos;s weight (kg) &times; quantity.
      </p>

      <div className="mt-6 max-w-md rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-navy-800/50">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Base price (first 1kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="input"
                placeholder="500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                Price per additional kg
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={extraKgPrice}
                onChange={(e) => setExtraKgPrice(e.target.value)}
                className="input"
                placeholder="150"
              />
            </div>
            <p className="text-xs text-navy-800/50">
              Example: a 3.4kg order costs the base price plus 3 extra kg (rounded up), i.e.
              base + 3 &times; extra-kg price.
            </p>
            <button onClick={save} disabled={saving} className="btn-primary w-full disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
