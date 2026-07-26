import { pool } from "@/lib/db";
import { getProductBySlug } from "@/lib/products-db";
import { validatePromoCode, recordPromotionUsage, Promotion } from "@/lib/promotions";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";
import { WHOLESALE_MIN_QTY } from "@/lib/pricing";
import type { PoolConnection } from "mysql2/promise";
import type { ProductPaymentMethod } from "@/lib/types";

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
  district: string;
  districtId: number;
  city: string;
  cityId: number;
  postalCode: string;
}

export interface OrderLineItem {
  productId: number;
  variantId: number | null;
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
  userId?: number,
  paymentMethod?: ProductPaymentMethod
) {
  let isWholesaleCustomer = false;
  if (userId) {
    const [rows] = await pool.query(
      "SELECT is_wholesale_customer FROM users WHERE id = ? AND role = 'buyer' AND deleted_at IS NULL LIMIT 1",
      [userId]
    );
    isWholesaleCustomer = !!(rows as { is_wholesale_customer: number }[])[0]?.is_wholesale_customer;
  }
  let subtotal = 0;
  let totalWeightKg = 0;
  const lineItems: OrderLineItem[] = [];
  const cartQuantity = items.reduce(
    (sum, line) => sum + Math.max(1, Number(line.quantity) || 1),
    0
  );
  for (const line of items) {
    const product = await getProductBySlug(line.slug);
    if (!product) throw new Error(`Unknown product: ${line.slug}`);
    if (paymentMethod && !product.paymentMethods.includes(paymentMethod)) {
      const label = paymentMethod === "cod" ? "Cash on Delivery" : "OnePay card payment";
      throw new Error(`${label} is not available for ${product.name}`);
    }
    const variant = line.variantId ? product.variants?.find((item) => item.id === Number(line.variantId)) : undefined;
    if (line.variantId && !variant) throw new Error(`Unknown product variation for ${product.name}`);
    const qty = Math.max(1, Number(line.quantity) || 1);
    if (variant && variant.stock < qty) throw new Error(`Only ${variant.stock} available for ${variant.attributeSummary}`);
    const regularPrice = variant?.price ?? product.price;
    const salePrice = variant?.salePrice && variant.salePrice > 0 && variant.salePrice < regularPrice ? variant.salePrice : regularPrice;
    const wholesalePrice = variant?.wholesalePrice ?? product.wholesalePrice;
    // Mixed products and variations share one cart-wide wholesale threshold.
    const unitPrice = (isWholesaleCustomer || cartQuantity >= WHOLESALE_MIN_QTY) && wholesalePrice != null && wholesalePrice > 0 && wholesalePrice < salePrice
      ? wholesalePrice
      : salePrice;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    totalWeightKg += (variant?.weightKg ?? product.weightKg ?? 0) * qty;
    lineItems.push({
      productId: Number(product.id),
      variantId: variant?.id ?? null,
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
    await conn.query(
      "SET @stock_movement_type = 'customer_order_hold', @stock_reference_type = 'customer_order', @stock_reference_id = ?",
      [orderRef]
    );

    const [orderResult] = await conn.execute(
      `INSERT INTO orders
        (order_ref, user_id, customer_name, customer_email, customer_phone,
         address, district, district_id, city, city_id, postal_code, subtotal, shipping, total, status,
         payment_method, payment_status, promo_code, discount)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,'unpaid',?,?)`,
      [
        orderRef,
        opts.userId,
        opts.customer.name,
        opts.customer.email,
        opts.customer.phone || "",
        opts.customer.address,
        opts.customer.district,
        opts.customer.districtId,
        opts.customer.city || "",
        opts.customer.cityId,
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
      const [productRows] = await conn.execute(
        "SELECT stock FROM products WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE",
        [li.productId]
      );
      if (!(productRows as { stock: number }[])[0]) throw new Error(`Product is no longer available: ${li.name}`);
      if (li.variantId) {
        const [variantRows] = await conn.execute(
          "SELECT stock FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1 FOR UPDATE",
          [li.variantId, li.productId]
        );
        const variant = (variantRows as { stock: number }[])[0];
        if (!variant || Number(variant.stock) < li.quantity) throw new Error(`Not enough stock for ${li.name}`);
        await conn.execute("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [li.quantity, li.variantId]);
      } else if (Number((productRows as { stock: number }[])[0].stock) < li.quantity) {
        throw new Error(`Not enough stock for ${li.name}`);
      }
      await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [li.quantity, li.productId]);
      await conn.execute(
        `INSERT INTO order_items
          (order_id, product_slug, product_id, variant_id, name, size, color, quantity, unit_price, line_total)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [orderId, li.slug, li.productId, li.variantId, li.name, li.size, li.color, li.quantity, li.unitPrice, li.lineTotal]
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
    if (conn) {
      await conn.query("SET @stock_movement_type = NULL, @stock_reference_type = NULL, @stock_reference_id = NULL").catch(() => {});
      conn.release();
    }
  }
}

/** Cancels an order that failed to reach a payment gateway (e.g. OnePay request failed). */
export async function cancelOrder(orderId: number): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT id, status, inventory_reverted_at FROM orders WHERE id = ? LIMIT 1 FOR UPDATE", [orderId]
    );
    const order = (rows as { id: number; status: string; inventory_reverted_at: string | null }[])[0];
    if (!order) throw new Error("Order not found");
    if (!order.inventory_reverted_at) {
      const [items] = await conn.execute("SELECT product_id, product_slug, variant_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
      for (const item of items as { product_id: number | null; product_slug: string; variant_id: number | null; quantity: number }[]) {
        if (item.variant_id) await conn.execute("UPDATE product_variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variant_id]);
        if (item.product_id) await conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        else await conn.execute("UPDATE products SET stock = stock + ? WHERE slug = ?", [item.quantity, item.product_slug]);
      }
    }
    await conn.execute("UPDATE orders SET status = 'cancelled', inventory_reverted_at = COALESCE(inventory_reverted_at, NOW()) WHERE id = ?", [orderId]);
    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally { conn.release(); }
}
