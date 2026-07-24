import { NextResponse } from "next/server";
import type { PoolConnection } from "mysql2/promise";
import { pool, query } from "@/lib/db";
import { requireReseller, makeRef, WHOLESALE_MIN_QTY } from "@/lib/reseller";
import { sendOrderConfirmationSms } from "@/lib/sms";
import { sendOrderEmail } from "@/lib/mail";
import { requestWaybill, submitOrder } from "@/lib/koombiyo";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";

interface OrderRow {
  id: number; order_ref: string; customer_name: string; customer_phone: string;
  amount: string; subtotal: string; delivery_fee: string; profit: string; status: string;
  reject_reason: string | null; payment_status: string; koombiyo_waybill_id: string | null;
  koombiyo_status: string | null; created_at: string;
}

export async function GET(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const status = new URL(request.url).searchParams.get("status");
  try {
    const conditions = ["reseller_id = ?"];
    const params: unknown[] = [reseller.id];
    if (status && status !== "all") { conditions.push("status = ?"); params.push(status); }
    const orders = await query<OrderRow>(
      `SELECT id, order_ref, customer_name, customer_phone, amount, subtotal, delivery_fee, profit,
              status, reject_reason, payment_status, koombiyo_waybill_id, koombiyo_status, created_at
       FROM reseller_orders WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`, params
    );
    let itemsByOrder = new Map<number, number>();
    if (orders.length) {
      const ids = orders.map((o) => o.id);
      const counts = await query<{ order_id: number; qty: number }>(
        `SELECT order_id, COALESCE(SUM(quantity),0) AS qty FROM reseller_order_items
         WHERE order_id IN (${ids.map(() => "?").join(",")}) GROUP BY order_id`, ids
      );
      itemsByOrder = new Map(counts.map((c) => [c.order_id, Number(c.qty)]));
    }
    return NextResponse.json({ orders: orders.map((o) => ({
      orderRef: o.order_ref, customerName: o.customer_name, customerPhone: o.customer_phone,
      amount: Number(o.amount), subtotal: Number(o.subtotal), deliveryFee: Number(o.delivery_fee),
      profit: Number(o.profit), status: o.status, rejectReason: o.reject_reason,
      paymentStatus: o.payment_status, quantity: itemsByOrder.get(o.id) ?? 0,
      koombiyoWaybillId: o.koombiyo_waybill_id, koombiyoStatus: o.koombiyo_status,
      createdAt: o.created_at,
    })) });
  } catch (error) {
    console.error("reseller orders GET error:", error);
    return NextResponse.json({ error: "Order service did not return a response" }, { status: 500 });
  }
}

interface NewOrderItem { slug: string; variantId?: number | null; quantity: number; sellingPrice: number }
interface CustomerInput {
  name?: string; email?: string; phone?: string; addressLine1?: string; addressLine2?: string;
  province?: string; district?: string; districtId?: number | null; city?: string; cityId?: number | null;
  postalCode?: string; notes?: string;
}
class OrderValidationError extends Error {}

export async function POST(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { customer?: CustomerInput; items?: NewOrderItem[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const customer = body.customer ?? {};
  const items = body.items ?? [];
  if (!customer.name?.trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  const phone = customer.phone?.replace(/[\s()-]/g, "") || "";
  if (!/^(?:\+94|94|0)?7\d{8}$/.test(phone)) return NextResponse.json({ error: "Enter a valid Sri Lankan mobile number" }, { status: 400 });
  if (!customer.addressLine1?.trim() || !customer.province?.trim() || !customer.district?.trim() || !customer.city?.trim()) {
    return NextResponse.json({ error: "Address, province, district and city are required" }, { status: 400 });
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
    return NextResponse.json({ error: "Enter a valid customer email" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Add at least one product" }, { status: 400 });

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [settingRows] = await conn.execute(
      `SELECT allow_price_override, min_markup_pct, max_markup_pct, credit_limit, email, phone
       FROM users WHERE id = ? AND role = 'reseller' AND reseller_status = 'approved' LIMIT 1 FOR UPDATE`,
      [reseller.id]
    );
    const settings = (settingRows as { allow_price_override: number; min_markup_pct: string; max_markup_pct: string | null; credit_limit: string; email: string; phone: string }[])[0];
    if (!settings) throw new OrderValidationError("Your reseller account is not active");

    const lineItems: Array<{
      slug: string; productId: number; variantId: number | null; variantSummary: string | null;
      sku: string; name: string; quantity: number; resellerPrice: number; sellingPrice: number; lineTotal: number;
    }> = [];
    let subtotal = 0;
    let merchandiseCost = 0;
    let totalWeightKg = 0;

    for (const item of items) {
      const qty = Math.floor(Number(item.quantity));
      if (!Number.isFinite(qty) || qty < 1 || qty > 10000) throw new OrderValidationError("Enter a valid quantity");
      const [productRows] = await conn.execute(
        `SELECT id, slug, sku, name, price, reseller_price, wholesale_price,
                stock, product_type, allow_backorder, weight_kg FROM products
         WHERE slug = ? AND is_reseller_product = 1 AND is_publish = 1 LIMIT 1 FOR UPDATE`, [item.slug]
      );
      const product = (productRows as any[])[0];
      if (!product) throw new OrderValidationError(`Unknown product: ${item.slug}`);
      if (product.reseller_price == null) throw new OrderValidationError(`${product.name} is not available for resellers`);

      let variant: any = null;
      if (item.variantId) {
        const [variantRows] = await conn.execute(
          `SELECT id, sku, attribute_summary, price, sale_price, reseller_price, wholesale_price, stock, weight_kg
           FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1 FOR UPDATE`, [item.variantId, product.id]
        );
        variant = (variantRows as any[])[0];
        if (!variant) throw new OrderValidationError(`The selected option for ${product.name} is unavailable`);
      } else if (product.product_type === "variable") {
        throw new OrderValidationError(`Choose a size/colour option for ${product.name}`);
      }
      totalWeightKg += Number(variant?.weight_kg ?? product.weight_kg ?? 0) * qty;

      const availableStock = Number(variant ? variant.stock : product.stock);
      if (!product.allow_backorder && availableStock < qty) {
        throw new OrderValidationError(`Not enough stock for ${product.name}${variant?.attribute_summary ? ` (${variant.attribute_summary})` : ""}. Only ${availableStock} left.`);
      }
      const standardCost = Number(variant?.reseller_price ?? product.reseller_price);
      const wholesaleRaw = variant?.wholesale_price ?? product.wholesale_price;
      const wholesale = wholesaleRaw == null ? null : Number(wholesaleRaw);
      const unitCost = qty >= WHOLESALE_MIN_QTY && wholesale != null && wholesale > 0 ? wholesale : standardCost;
      const minPrice = Math.max(unitCost, unitCost * (1 + Number(settings.min_markup_pct || 0) / 100));
      const maxMarkup = settings.max_markup_pct == null ? null : Number(settings.max_markup_pct);
      const maxPrice = maxMarkup == null ? null : unitCost * (1 + maxMarkup / 100);
      const regularRetail = Number(variant?.price ?? product.price);
      const variantSalePrice = variant?.sale_price != null ? Number(variant.sale_price) : null;
      const effectiveRetail = variantSalePrice != null && variantSalePrice > 0 && variantSalePrice < regularRetail
        ? variantSalePrice
        : regularRetail;
      let sellingPrice = Number(item.sellingPrice);
      if (!settings.allow_price_override) sellingPrice = effectiveRetail;
      if (!Number.isFinite(sellingPrice) || sellingPrice < minPrice - 0.005) {
        throw new OrderValidationError(`Selling price for ${product.name} must be at least LKR ${minPrice.toFixed(2)}`);
      }
      if (maxPrice != null && sellingPrice > maxPrice + 0.005) {
        throw new OrderValidationError(`Selling price for ${product.name} cannot exceed LKR ${maxPrice.toFixed(2)}`);
      }

      const lineTotal = sellingPrice * qty;
      subtotal += lineTotal;
      merchandiseCost += unitCost * qty;
      lineItems.push({ slug: product.slug, productId: product.id, variantId: variant?.id ?? null,
        variantSummary: variant?.attribute_summary ?? null, sku: variant?.sku || product.sku,
        name: product.name, quantity: qty, resellerPrice: unitCost, sellingPrice, lineTotal });
      if (variant) await conn.execute("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [qty, variant.id]);
      else await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, product.id]);
    }

    const deliveryFee = computeDeliveryFee(totalWeightKg, await getDeliveryPricing());
    const creditLimit = Number(settings.credit_limit || 0);
    if (creditLimit > 0 && merchandiseCost > creditLimit) {
      throw new OrderValidationError(`This order exceeds your reseller credit limit of LKR ${creditLimit.toFixed(2)}`);
    }
    const amount = subtotal + deliveryFee;
    const cost = merchandiseCost + deliveryFee;
    const profit = subtotal - merchandiseCost;
    const orderRef = makeRef("ORD");
    const fullAddress = [customer.addressLine1, customer.addressLine2, customer.city, customer.district, customer.province, customer.postalCode].filter(Boolean).join(", ");
    const [result] = await conn.execute(
      `INSERT INTO reseller_orders
       (order_ref, reseller_id, customer_name, customer_phone, customer_address, customer_email,
        address_line1, address_line2, province, district, district_id, city, city_id, postal_code, notes,
        subtotal, delivery_fee, amount, cost, profit, status, payment_status, koombiyo_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending','unpaid','Awaiting dispatch')`,
      [orderRef, reseller.id, customer.name.trim(), phone, fullAddress, customer.email?.trim() || null,
       customer.addressLine1.trim(), customer.addressLine2?.trim() || null, customer.province.trim(), customer.district.trim(),
       Number(customer.districtId) || null, customer.city.trim(), Number(customer.cityId) || null,
       customer.postalCode?.trim() || null, customer.notes?.trim() || null, subtotal, deliveryFee, amount, cost, profit]
    );
    const orderId = (result as { insertId: number }).insertId;
    for (const line of lineItems) {
      await conn.execute(
        `INSERT INTO reseller_order_items
         (order_id, product_slug, product_id, variant_id, variant_summary, sku, name, quantity, reseller_price, selling_price, line_total)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [orderId, line.slug, line.productId, line.variantId, line.variantSummary, line.sku, line.name,
         line.quantity, line.resellerPrice, line.sellingPrice, line.lineTotal]
      );
    }
    await conn.commit();

    let courierWarning: string | null = null;
    try {
      if (!customer.districtId || !customer.cityId) throw new Error("Courier location IDs were not available");
      const waybillId = await requestWaybill();
      const courierResponse = await submitOrder({ waybillId, orderRef, receiverName: customer.name.trim(),
        receiverStreet: fullAddress, receiverPhone: phone, codAmount: amount,
        description: lineItems.map((line) => `${line.name} x${line.quantity}`).join(", ").slice(0, 250),
        specialNote: customer.notes, districtId: Number(customer.districtId), cityId: Number(customer.cityId) });
      await query(`UPDATE reseller_orders SET koombiyo_waybill_id = ?, koombiyo_status = 'Booked',
                   koombiyo_response = ?, koombiyo_updated_at = NOW(), status = 'confirmed' WHERE id = ?`,
        [waybillId, JSON.stringify(courierResponse), orderId]);
    } catch (error) {
      courierWarning = error instanceof Error ? error.message : "Courier booking is pending";
      await query("UPDATE reseller_orders SET koombiyo_status = ?, koombiyo_updated_at = NOW() WHERE id = ?", [`Pending: ${courierWarning}`.slice(0, 100), orderId]);
    }

    await Promise.allSettled([
      sendOrderConfirmationSms({ phone, orderRef, total: amount, status: courierWarning ? "pending" : "confirmed" }),
      sendOrderConfirmationSms({ phone: settings.phone, orderRef, total: amount, status: courierWarning ? "pending" : "confirmed" }),
      customer.email ? sendOrderEmail(customer.email, { orderRef, total: amount, status: "received" }) : Promise.resolve(),
      sendOrderEmail(settings.email, { orderRef, total: amount, status: "received" }),
    ]);
    return NextResponse.json({ success: true, order: { orderRef, subtotal, deliveryFee, amount, profit, status: courierWarning ? "pending" : "confirmed" }, courierWarning });
  } catch (error) {
    if (conn) await conn.rollback().catch(() => {});
    if (error instanceof OrderValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("reseller order POST error:", error);
    return NextResponse.json({ error: "Could not create order" }, { status: 500 });
  } finally { conn?.release(); }
}
