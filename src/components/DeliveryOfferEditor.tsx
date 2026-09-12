"use client";
import { useEffect, useState } from "react";
import { type DeliveryOffer, type DeliveryChannel } from "@/lib/delivery-offer";
import { useToast } from "@/context/ToastProvider";
function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export default function DeliveryOfferEditor() {
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [slugs, setSlugs] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => { fetch("/api/admin/settings/delivery-offer", { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setOffer(d.offer); setSlugs(d.offer.productSlugs.join(", ")); }).catch(e => setError(e.message)); }, []);
  const save = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/admin/settings/delivery-offer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...offer, productSlugs: slugs.split(/[\s,]+/).filter(Boolean) }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setOffer(d.offer); toast("Delivery offer saved");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save offer"); }
    finally { setSaving(false); }
  };
  if (!offer) return <p className="my-6" role="status">{error || "Loading delivery offer…"}</p>;
  return <section className="my-6 rounded-2xl border border-brand/20 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold text-navy-800">Quantity-based delivery offer</h2>
    <p className="mt-2 text-sm text-navy-800/60">Delivery discounts depend on item quantity, regardless of product price. The lowest eligible delivery charge applies. POS pickup is always free.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="flex items-center gap-2 md:col-span-2"><input type="checkbox" checked={offer.enabled} onChange={e => setOffer({ ...offer, enabled: e.target.checked })} /> Enable offer</label>
      <label>Offer name<input className="input mt-1" maxLength={120} value={offer.name} onChange={e => setOffer({ ...offer, name: e.target.value })} /></label>
      <label>Customer message<input className="input mt-1" maxLength={500} value={offer.description} onChange={e => setOffer({ ...offer, description: e.target.value })} /></label>
      <label>Start (your local time)<input className="input mt-1" type="datetime-local" value={localDate(offer.startDate)} onChange={e => setOffer({ ...offer, startDate: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
      <label>End (your local time)<input className="input mt-1" type="datetime-local" value={localDate(offer.endDate)} onChange={e => setOffer({ ...offer, endDate: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
      <fieldset className="md:col-span-2"><legend className="mb-2">Apply to</legend><div className="flex flex-wrap gap-6">{(["website", "pos", "reseller"] as DeliveryChannel[]).map(channel => <label key={channel} className="flex items-center gap-2 capitalize"><input type="checkbox" checked={offer.channels.includes(channel)} onChange={e => setOffer({ ...offer, channels: e.target.checked ? [...offer.channels, channel] : offer.channels.filter(c => c !== channel) })} />{channel}</label>)}</div></fieldset>
      <label className="md:col-span-2">Eligible product slugs (leave empty for all products)<textarea className="input mt-1" value={slugs} onChange={e => setSlugs(e.target.value)} placeholder="oversized-black-tee, printed-white-tee" /><span className="text-xs text-navy-800/60">Use the product URL slug. Only eligible units count; the resulting delivery fee covers the whole order, including other products.</span></label>
    </div>
    <div className="mt-4 space-y-3">{offer.tiers.map((tier,index) => <div key={index} className="flex flex-wrap items-end gap-3">
      <label>Minimum items<input aria-label={`Tier ${index+1} minimum items`} type="number" min="1" step="1" className="input mt-1 w-28" value={tier.quantity} onChange={e => setOffer({ ...offer, tiers: offer.tiers.map((t,i) => i === index ? { ...t, quantity: Number(e.target.value) } : t) })} /></label>
      <label>Delivery (Rs.)<input aria-label={`Tier ${index+1} delivery fee`} type="number" min="0" step="0.01" className="input mt-1 w-32" value={tier.fee} onChange={e => setOffer({ ...offer, tiers: offer.tiers.map((t,i) => i === index ? { ...t, fee: Number(e.target.value) } : t) })} /></label>
      <button type="button" className="btn-outline" disabled={offer.tiers.length === 1} onClick={() => setOffer({ ...offer, tiers: offer.tiers.filter((_,i) => i !== index) })}>Remove</button>
    </div>)}</div>
    <p className="mt-2 text-xs text-navy-800/60">Each tier applies until the next quantity. Enter 0 for free delivery. Empty dates mean no time limit. Reseller product margin is unchanged.</p>
    {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
    <div className="mt-4 flex gap-3"><button type="button" className="btn-outline" disabled={offer.tiers.length >= 20} onClick={() => setOffer({ ...offer, tiers: [...offer.tiers, { quantity: Math.max(...offer.tiers.map(t => t.quantity)) + 1, fee: 0 }] })}>Add tier</button><button type="button" className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save delivery offer"}</button></div>
  </section>;
}
