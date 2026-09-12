import type { PoolConnection } from "mysql2/promise";
import { query } from "@/lib/db";
import { DEFAULT_DELIVERY_OFFER, validateDeliveryOffer, type DeliveryOffer } from "@/lib/delivery-offer";
export async function getDeliveryOffer(): Promise<DeliveryOffer> {
  const rows = await query<{ setting_value: string }>("SELECT setting_value FROM site_settings WHERE setting_key = 'quantity_delivery_offer'");
  if (!rows.length) return DEFAULT_DELIVERY_OFFER;
  return validateDeliveryOffer(JSON.parse(rows[0].setting_value));
}
export async function setDeliveryOffer(offer: DeliveryOffer) {
  await query("INSERT INTO site_settings (setting_key, setting_value) VALUES ('quantity_delivery_offer', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)", [JSON.stringify(offer)]);
}
export async function saveDeliverySnapshot(conn: PoolConnection, channel: string, reference: string, fee: number, offerName: string | null) {
  await conn.execute("INSERT INTO delivery_offer_snapshots (channel, order_reference, delivery_fee, offer_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE delivery_fee = VALUES(delivery_fee), offer_name = VALUES(offer_name)", [channel, reference, fee, offerName]);
}
