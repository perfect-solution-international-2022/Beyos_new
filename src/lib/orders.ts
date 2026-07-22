import { pool } from "@/lib/db";
import { getProductBySlug } from "@/lib/products-db";
import { validatePromoCode, recordPromotionUsage, Promotion } from "@/lib/promotions";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";
import type { PoolConnection } from "mysql2/promise";

export interface CheckoutLine {
  slug: string;
  size: string;
  color: string;
  quantity: number;
  variantId?: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderLineItem {
  slug: string;
  name: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

const FREE_SHIPPING_THRESHOLD = 10000;

/**
 * Recomputes totals server-side from the live catalog — never trust
 * client-sent prices. If a promo code is given, it's re-validated against
 * the recomputed subtotal and this user's redemption history.
 */
export async function computeOrderTotals(
  items: CheckoutLine[],
  promoCode?: string,
  userId?: number
) {
  let subtotal = 0;
  let totalWeightKg = 0;
  const lineItems: OrderLineItem[] = [];
  for (const line of items) {
    const product = await getProductBySlug(line.slug);
    if (!product) throw new Error(`Unknown product: ${line.slug}`);
    const variant = line.variantId ? product.variants?.find((item) => item.id === Number(line.variantId)) : undefined;
    if (line.variantId && !variant) throw new Error(`Unknown product variation for ${product.name}`);
    const qty = Math.max(1, Number(line.quantity) || 1);
    if (variant && variant.stock < qty) throw new Error(`Only ${variant.stock} available for ${variant.attributeSummary}`);
    const regularPrice = variant?.price ?? product.price;
    const unitPrice = variant?.salePrice && variant.salePrice > 0 && variant.salePrice < regularPrice ? variant.salePrice : regularPrice;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    totalWeightKg += (variant?.weightKg ?? product.weightKg ?? 0) * qty;
    lineItems.push({
      slug: product.slug,
      name: product.name,
      size: variant?.attributeSummary || line.size,
      color: variant ? "" : line.color,
      quantity: qty,
      unitPrice,
      lineTotal,
    });
  }

  let discount = 0;
  let freeShipping = false;
  let appliedPromotion: Promotion | undefined;
  if (promoCode && userId) {
    const result = await validatePromoCode(promoCode, subtotal, userId);
    if (!result.valid) throw new Error(result.error || "Invalid promo code");
    discount = result.subtotalDiscount;
    freeShipping = result.freeShipping;
    appliedPromotion = result.promotion;
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const pricing = await getDeliveryPricing();
  const shipping = freeShipping || discountedSubtotal >= FREE_SHIPPING_THRESHOLD
    ? 0
    : computeDeliveryFee(totalWeightKg, pricing);
  const total = discountedSubtotal + shipping;

  return { subtotal, discount, shipping, total, lineItems, appliedPromotion };
}

export function makeOrderRef(): string {
  return (
    "BEY-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

/** Creates an order + its line items in a transaction. Order starts as pending/unpaid. */
export async function createPendingOrder(opts: {
  userId: number;
  customer: CustomerInfo;
  lineItems: OrderLineItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: "cod" | "onepay";
  appliedPromotion?: Promotion;
}): Promise<{ orderId: number; orderRef: string }> {
  const orderRef = makeOrderRef();
  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
        (order_ref, user_id, customer_name, customer_email, customer_phone,
         address, city, postal_code, subtotal, shipping, total, status,
         payment_method, payment_status, promo_code, discount)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,'unpaid',?,?)`,
      [
        orderRef,
        opts.userId,
        opts.customer.name,
        opts.customer.email,
        opts.customer.phone || "",
        opts.customer.address,
        opts.customer.city || "",
        opts.customer.postalCode || null,
        opts.subtotal,
        opts.shipping,
        opts.total,
        opts.paymentMethod,
        opts.appliedPromotion?.code ?? null,
        opts.discount,
      ]
    );
    const orderId = (orderResult as { insertId: number }).insertId;

    for (const li of opts.lineItems) {
      await conn.execute(
        `INSERT INTO order_items
          (order_id, product_slug, name, size, color, quantity, unit_price, line_total)
         VALUES (?,?,?,?,?,?,?,?)`,
        [orderId, li.slug, li.name, li.size, li.color, li.quantity, li.unitPrice, li.lineTotal]
      );
    }

    if (opts.appliedPromotion) {
      await recordPromotionUsage(
        opts.appliedPromotion.id,
        opts.userId,
        orderRef,
        opts.discount,
        conn
      );
    }

    await conn.commit();
    return { orderId, orderRef };
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

/** Cancels an order that failed to reach a payment gateway (e.g. OnePay request failed). */
export async function cancelOrder(orderId: number): Promise<void> {
  await pool.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
}
