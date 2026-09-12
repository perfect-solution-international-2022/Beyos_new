export type DeliveryChannel = "website" | "pos" | "reseller";
export interface DeliveryOffer {
  enabled: boolean;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  channels: DeliveryChannel[];
  productSlugs: string[];
  tiers: { quantity: number; fee: number }[];
}
export const DEFAULT_DELIVERY_OFFER: DeliveryOffer = {
  enabled: true, name: "Buy more, save on delivery", description: "Limited-time delivery offer",
  startDate: null, endDate: null, channels: ["website", "pos", "reseller"], productSlugs: [],
  tiers: [{ quantity: 1, fee: 350 }, { quantity: 2, fee: 200 }, { quantity: 3, fee: 0 }],
};
export function validateDeliveryOffer(value: unknown): DeliveryOffer {
  const o = value as DeliveryOffer;
  if (!o || typeof o.enabled !== "boolean" || typeof o.name !== "string" || !o.name.trim() || o.name.length > 120 || typeof o.description !== "string" || o.description.length > 500) throw new Error("Enter an offer name and description (maximum 120 / 500 characters)");
  if (!Array.isArray(o.channels) || o.channels.some(c => !["website", "pos", "reseller"].includes(c))) throw new Error("Choose valid sales channels");
  if (!Array.isArray(o.productSlugs) || o.productSlugs.length > 500 || o.productSlugs.some(s => typeof s !== "string" || !/^[a-z0-9-]+$/.test(s))) throw new Error("Enter valid product slugs");
  if (!Array.isArray(o.tiers) || !o.tiers.length || o.tiers.length > 20 || o.tiers.some(t => !Number.isSafeInteger(t.quantity) || t.quantity < 1 || typeof t.fee !== "number" || !Number.isFinite(t.fee) || t.fee < 0 || t.fee > 1000000)) throw new Error("Enter valid quantities and delivery fees");
  const tiers = [...o.tiers].sort((a,b) => a.quantity - b.quantity);
  if (new Set(tiers.map(t => t.quantity)).size !== tiers.length || tiers.some((t,i) => i > 0 && t.fee > tiers[i-1].fee)) throw new Error("Quantities must be unique and delivery fees must not increase with quantity");
  for (const date of [o.startDate, o.endDate]) if (date !== null && (typeof date !== "string" || !Number.isFinite(Date.parse(date)))) throw new Error("Enter valid offer dates");
  if (o.startDate && o.endDate && Date.parse(o.startDate) >= Date.parse(o.endDate)) throw new Error("End date must be after start date");
  return { enabled: o.enabled, name: o.name.trim(), description: o.description.trim(), startDate: o.startDate, endDate: o.endDate, channels: [...new Set(o.channels)], productSlugs: [...new Set(o.productSlugs)], tiers };
}
export function isDeliveryOfferActive(offer: DeliveryOffer, channel: DeliveryChannel, now = Date.now()) {
  return offer.enabled && offer.channels.includes(channel) && (!offer.startDate || now >= Date.parse(offer.startDate)) && (!offer.endDate || now < Date.parse(offer.endDate));
}
export function deliveryOfferQuote(offer: DeliveryOffer, channel: DeliveryChannel, items: { slug: string; quantity: number }[], standardFee: number, now = Date.now()) {
  const quantity = items.reduce((sum, line) => sum + ((!offer.productSlugs.length || offer.productSlugs.includes(line.slug)) && Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0), 0);
  const tier = isDeliveryOfferActive(offer, channel, now) ? [...offer.tiers].reverse().find(t => quantity >= t.quantity) : undefined;
  const applied = !!tier && tier.fee <= standardFee;
  return { fee: applied ? tier!.fee : standardFee, offerName: applied ? offer.name : null, quantity };
}
