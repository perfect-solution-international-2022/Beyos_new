import { query } from "@/lib/db";

const BASE_PRICE_KEY = "delivery_base_price";
const EXTRA_KG_PRICE_KEY = "delivery_extra_kg_price";

const DEFAULT_BASE_PRICE = 500;
const DEFAULT_EXTRA_KG_PRICE = 150;

export interface DeliveryPricing {
  basePrice: number;
  extraKgPrice: number;
}

export async function getDeliveryPricing(): Promise<DeliveryPricing> {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?, ?)`,
    [BASE_PRICE_KEY, EXTRA_KG_PRICE_KEY]
  );
  const map = new Map(rows.map((r) => [r.setting_key, r.setting_value]));
  const basePrice = Number(map.get(BASE_PRICE_KEY));
  const extraKgPrice = Number(map.get(EXTRA_KG_PRICE_KEY));
  return {
    basePrice: Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : DEFAULT_BASE_PRICE,
    extraKgPrice: Number.isFinite(extraKgPrice) && extraKgPrice >= 0 ? extraKgPrice : DEFAULT_EXTRA_KG_PRICE,
  };
}

export async function setDeliveryPricing(pricing: DeliveryPricing): Promise<void> {
  await query(
    `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [BASE_PRICE_KEY, String(pricing.basePrice)]
  );
  await query(
    `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [EXTRA_KG_PRICE_KEY, String(pricing.extraKgPrice)]
  );
}

/**
 * Base price covers the first 1kg; every additional kg (rounded up) is
 * charged at extraKgPrice. Products with no weight set are treated as
 * negligible (0kg) rather than failing the order.
 */
export function computeDeliveryFee(totalWeightKg: number, pricing: DeliveryPricing): number {
  if (totalWeightKg <= 1) return pricing.basePrice;
  const extraKg = Math.ceil(totalWeightKg - 1);
  return pricing.basePrice + extraKg * pricing.extraKgPrice;
}
