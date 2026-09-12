"use client";
import { useEffect, useState } from "react";
import type { DeliveryChannel } from "@/lib/delivery-offer";
export function useShippingEstimate(items: { slug: string; quantity: number; variantId?: number | null }[], channel: DeliveryChannel, options: { enabled?: boolean; discountedSubtotal?: number; freeShipping?: boolean; wholesale?: boolean } = {}) {
  const enabled = options.enabled !== false && items.length > 0;
  const payload = JSON.stringify({ items: items.map(({slug,quantity,variantId}) => ({slug,quantity,variantId})), channel, discountedSubtotal: options.discountedSubtotal, freeShipping: options.freeShipping, wholesale: options.wholesale });
  const [state, setState] = useState({ key: "", fee: 0, offerName: null as string | null, error: "", loading: true });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/shipping/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Number.isFinite(data.shipping) || data.shipping < 0) throw new Error(data.error || "Could not calculate delivery");
        if (active) setState({ key: payload, fee: data.shipping, offerName: data.offerName ?? null, error: "", loading: false });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, key: payload, offerName: null, error: "Could not calculate delivery. Retrying…", loading: false }));
      }
    };
    refresh(); const timer = window.setInterval(refresh, 15000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [payload, enabled]);
  if (!enabled) return { fee: 0, offerName: null, error: "", loading: false };
  if (state.key !== payload) return { fee: 0, offerName: null, error: "", loading: true };
  return state;
}
