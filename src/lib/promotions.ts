import { query, pool } from "@/lib/db";
import type { PoolConnection } from "mysql2/promise";

export interface Promotion {
  id: number;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed" | "free_shipping";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usageLimitPerUser: number | null;
  isActive: boolean;
}

interface PromotionRow {
  id: number;
  code: string;
  description: string | null;
  discount_type: Promotion["discountType"];
  discount_value: string;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  is_active: number;
}

function mapRow(r: PromotionRow): Promotion {
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value),
    minOrderAmount: r.min_order_amount ? Number(r.min_order_amount) : null,
    maxDiscountAmount: r.max_discount_amount ? Number(r.max_discount_amount) : null,
    startDate: r.start_date,
    endDate: r.end_date,
    usageLimit: r.usage_limit,
    usageLimitPerUser: r.usage_limit_per_user,
    isActive: !!r.is_active,
  };
}

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  promotion?: Promotion;
  subtotalDiscount: number;
  freeShipping: boolean;
}

/**
 * Validates a promo code against the current subtotal and this user's usage
 * history. Always recomputed server-side — the client never gets to say how
 * much a code is worth.
 */
export async function validatePromoCode(
  rawCode: string,
  subtotal: number,
  userId: number
): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase();
  const invalid = (error: string): PromoValidationResult => ({
    valid: false,
    error,
    subtotalDiscount: 0,
    freeShipping: false,
  });

  if (!code) return invalid("Enter a promo code");

  const rows = await query<PromotionRow>("SELECT * FROM promotions WHERE code = ? LIMIT 1", [code]);
  const row = rows[0];
  if (!row) return invalid("Invalid promo code");

  const promotion = mapRow(row);
  if (!promotion.isActive) return invalid("This promo code is no longer active");

  const now = new Date();
  if (promotion.startDate && now < new Date(promotion.startDate)) {
    return invalid("This promo code isn't active yet");
  }
  if (promotion.endDate && now > new Date(promotion.endDate)) {
    return invalid("This promo code has expired");
  }
  if (promotion.minOrderAmount && subtotal < promotion.minOrderAmount) {
    return invalid(`Add ${promotion.minOrderAmount} more to your cart to use this code`);
  }

  if (promotion.usageLimit !== null) {
    const [{ count }] = await query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM promotion_usages WHERE promotion_id = ?",
      [promotion.id]
    );
    if (Number(count) >= promotion.usageLimit) {
      return invalid("This promo code has reached its usage limit");
    }
  }
  if (promotion.usageLimitPerUser !== null) {
    const [{ count }] = await query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM promotion_usages WHERE promotion_id = ? AND user_id = ?",
      [promotion.id, userId]
    );
    if (Number(count) >= promotion.usageLimitPerUser) {
      return invalid("You've already used this promo code the maximum number of times");
    }
  }

  if (promotion.discountType === "free_shipping") {
    return { valid: true, promotion, subtotalDiscount: 0, freeShipping: true };
  }
  if (promotion.discountType === "percentage") {
    let discount = subtotal * (promotion.discountValue / 100);
    if (promotion.maxDiscountAmount) discount = Math.min(discount, promotion.maxDiscountAmount);
    return { valid: true, promotion, subtotalDiscount: Math.round(discount), freeShipping: false };
  }
  // fixed
  const discount = Math.min(promotion.discountValue, subtotal);
  return { valid: true, promotion, subtotalDiscount: Math.round(discount), freeShipping: false };
}

/** Records a redemption inside an existing transaction (or the pool if none given). */
export async function recordPromotionUsage(
  promotionId: number,
  userId: number,
  orderRef: string,
  discountAmount: number,
  conn?: PoolConnection
): Promise<void> {
  const runner = conn ?? pool;
  await runner.execute(
    "INSERT INTO promotion_usages (promotion_id, user_id, order_ref, discount_amount) VALUES (?,?,?,?)",
    [promotionId, userId, orderRef, discountAmount]
  );
}
