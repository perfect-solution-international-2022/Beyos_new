import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendOrderStatusSms } from "@/lib/sms";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";
import type { PoolConnection } from "mysql2/promise";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await query<any>(
      `SELECT s.*, c.name AS cashier_name FROM pos_sales s
       JOIN pos_cashiers c ON c.id = s.cashier_id WHERE s.receipt_number = ? LIMIT 1`,
      [receiptNumber]
    );
    const sale = rows[0];
    if (!sale) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const items = await query<any>(
      "SELECT * FROM pos_sale_items WHERE sale_id = ?",
      [sale.id]
    );

    return NextResponse.json({
      receipt: {
        receiptNumber: sale.receipt_number,
        cashierName: sale.cashier_name,
        customerName: sale.customer_name || "Walk-in Customer",
        customerPhone: sale.customer_phone || "",
        items: items.map((i: any) => ({
          slug: i.product_slug, name: i.name, sku: i.sku, size: i.size, color: i.color,
          quantity: i.quantity, unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total),
        })),
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discount_amount),
        taxAmount: Number(sale.tax_amount),
        deliveryFee: Number(sale.delivery_fee || 0),
        total: Number(sale.total),
        paymentMethod: sale.payment_method,
        amountTendered: sale.amount_tendered !== null ? Number(sale.amount_tendered) : null,
        changeDue: sale.change_due !== null ? Number(sale.change_due) : null,
        fulfillmentType: sale.fulfillment_type ?? "pickup",
        deliveryAddress: sale.delivery_address,
        deliveryCity: sale.delivery_city,
        deliveryStatus: sale.delivery_status,
        koombiyoWaybillId: sale.koombiyo_waybill_id,
        koombiyoStatus: sale.koombiyo_status,
        createdAt: sale.created_at,
      },
    });
  } catch (err) {
    console.error("pos receipt GET error:", err);
    return NextResponse.json({ error: "Could not load receipt" }, { status: 500 });
  }
}

const DELIVERY_STATUSES = ["pending", "accepted", "out_for_delivery", "delivered", "cancelled"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: { deliveryStatus?: string };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.deliveryStatus || !DELIVERY_STATUSES.includes(b.deliveryStatus)) {
    return NextResponse.json({ error: "Invalid delivery status" }, { status: 400 });
  }

  try {
    const rows = await query<{ id: number; fulfillment_type: string; customer_phone: string | null; delivery_status: string | null; inventory_reverted_at: string | null }>(
      "SELECT id, fulfillment_type, customer_phone, delivery_status, inventory_reverted_at FROM pos_sales WHERE receipt_number = ? LIMIT 1",
      [receiptNumber]
    );
    const sale = rows[0];
    if (!sale) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    if (sale.fulfillment_type !== "delivery") {
      return NextResponse.json({ error: "This sale is not a delivery order" }, { status: 400 });
    }
    if (sale.delivery_status === "cancelled" && sale.delivery_status !== b.deliveryStatus) {
      return NextResponse.json({ error: "A cancelled delivery order cannot be reopened" }, { status: 400 });
    }

    if (b.deliveryStatus === "cancelled" && !sale.inventory_reverted_at) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [items] = await conn.execute(
          "SELECT product_slug, quantity FROM pos_sale_items WHERE sale_id = ?",
          [sale.id]
        );
        for (const item of items as { product_slug: string; quantity: number }[]) {
          await conn.execute("UPDATE products SET stock = stock + ? WHERE slug = ?", [item.quantity, item.product_slug]);
        }
        await conn.execute(
          "UPDATE pos_sales SET delivery_status = ?, inventory_reverted_at = NOW() WHERE id = ?",
          [b.deliveryStatus, sale.id]
        );
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } else {
      await query("UPDATE pos_sales SET delivery_status = ? WHERE id = ?", [b.deliveryStatus, sale.id]);
    }

    if (sale.delivery_status !== b.deliveryStatus) {
      await sendOrderStatusSms(sale.customer_phone, receiptNumber, b.deliveryStatus);
    }
    return NextResponse.json({ ok: true, deliveryStatus: b.deliveryStatus });
  } catch (err) {
    console.error("pos delivery status PATCH error:", err);
    return NextResponse.json({ error: "Could not update delivery status" }, { status: 500 });
  }
}

interface EditSaleLine {
  slug: string;
  size: string;
  color: string;
  quantity: number;
}

/**
 * Replaces a completed sale's items/totals in place — for a cashier fixing a
 * mistake (wrong item, quantity, etc). Only allowed while the sale hasn't
 * progressed past admin approval: pickup sales are always editable; delivery
 * sales are editable only while delivery_status is still 'pending' (i.e. not
 * yet accepted) and no Koombiyo waybill has been requested.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const { receiptNumber } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: {
    items?: EditSaleLine[];
    customerName?: string;
    customerPhone?: string;
    discountAmount?: number;
    taxRate?: number;
    paymentMethod?: "cash" | "card";
    amountTendered?: number;
    fulfillmentType?: "pickup" | "delivery";
    deliveryAddress?: string;
    deliveryCity?: string;
  };
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  const paymentMethod = b.paymentMethod === "card" ? "card" : "cash";
  const fulfillmentType = b.fulfillmentType === "delivery" ? "delivery" : "pickup";
  const deliveryAddress = (b.deliveryAddress ?? "").trim();
  const deliveryCity = (b.deliveryCity ?? "").trim();
  if (fulfillmentType === "delivery" && !deliveryAddress) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  let conn: PoolConnection | null = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [saleRows] = await conn.execute(
      `SELECT id, shift_id, cashier_id, fulfillment_type, delivery_status, koombiyo_waybill_id
       FROM pos_sales WHERE receipt_number = ? LIMIT 1 FOR UPDATE`,
      [receiptNumber]
    );
    const sale = (saleRows as any[])[0];
    if (!sale) { await conn.rollback(); return NextResponse.json({ error: "Receipt not found" }, { status: 404 }); }

    if (sale.koombiyo_waybill_id) {
      await conn.rollback();
      return NextResponse.json({ error: "This order already has a courier waybill and can no longer be edited" }, { status: 400 });
    }
    if (sale.fulfillment_type === "delivery" && sale.delivery_status && sale.delivery_status !== "pending") {
      await conn.rollback();
      return NextResponse.json({ error: "This delivery order has already been accepted and can no longer be edited" }, { status: 400 });
    }

    // Restore stock for the sale's current items before applying the edited cart.
    const [oldItems] = await conn.execute(
      "SELECT product_slug, quantity FROM pos_sale_items WHERE sale_id = ?",
      [sale.id]
    );
    for (const item of oldItems as { product_slug: string; quantity: number }[]) {
      await conn.execute("UPDATE products SET stock = stock + ? WHERE slug = ?", [item.quantity, item.product_slug]);
    }
    await conn.execute("DELETE FROM pos_sale_items WHERE sale_id = ?", [sale.id]);

    let subtotal = 0;
    let totalWeightKg = 0;
    const lineItems: {
      slug: string; sku: string; name: string; size: string; color: string;
      quantity: number; unitPrice: number; lineTotal: number;
    }[] = [];

    for (const line of b.items) {
      const [rows] = await conn.execute(
        "SELECT id, slug, sku, name, price, stock, weight_kg FROM products WHERE slug = ? LIMIT 1 FOR UPDATE",
        [line.slug]
      );
      const product = (rows as any[])[0];
      if (!product) throw new Error(`Unknown product: ${line.slug}`);
      const qty = Math.max(1, Number(line.quantity) || 1);
      if (product.stock < qty) {
        throw new Error(`Not enough stock for ${product.name} (${product.stock} left)`);
      }
      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      totalWeightKg += Number(product.weight_kg || 0) * qty;
      lineItems.push({
        slug: product.slug, sku: product.sku, name: product.name,
        size: line.size || "", color: line.color || "",
        quantity: qty, unitPrice, lineTotal,
      });
      await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, product.id]);
    }

    const discountAmount = Math.min(Math.max(0, Number(b.discountAmount) || 0), subtotal);
    const taxableAmount = subtotal - discountAmount;
    const taxRate = Math.max(0, Number(b.taxRate) || 0);
    const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
    const deliveryFee = fulfillmentType === "delivery" ? computeDeliveryFee(totalWeightKg, await getDeliveryPricing()) : 0;
    const total = Math.round((taxableAmount + taxAmount + deliveryFee) * 100) / 100;

    let amountTendered: number | null = null;
    let changeDue: number | null = null;
    if (paymentMethod === "cash") {
      amountTendered = b.amountTendered == null ? total : Number(b.amountTendered) || 0;
      if (amountTendered < total) throw new Error("Amount tendered is less than the total due");
      changeDue = Math.round((amountTendered - total) * 100) / 100;
    }

    const deliveryStatus = fulfillmentType === "delivery" ? "pending" : null;
    await conn.execute(
      `UPDATE pos_sales SET
        customer_name = ?, customer_phone = ?, subtotal = ?, discount_amount = ?, tax_amount = ?,
        total = ?, payment_method = ?, amount_tendered = ?, change_due = ?,
        fulfillment_type = ?, delivery_address = ?, delivery_city = ?, delivery_status = ?, delivery_fee = ?
       WHERE id = ?`,
      [
        (b.customerName ?? "").trim() || null, (b.customerPhone ?? "").trim() || null,
        subtotal, discountAmount, taxAmount, total, paymentMethod, amountTendered, changeDue,
        fulfillmentType, deliveryAddress || null, deliveryCity || null, deliveryStatus, deliveryFee,
        sale.id,
      ]
    );

    for (const li of lineItems) {
      await conn.execute(
        `INSERT INTO pos_sale_items (sale_id, product_slug, sku, name, size, color, quantity, unit_price, line_total)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [sale.id, li.slug, li.sku, li.name, li.size, li.color, li.quantity, li.unitPrice, li.lineTotal]
      );
    }

    await conn.commit();

    return NextResponse.json({
      success: true,
      receipt: {
        receiptNumber,
        items: lineItems,
        customerName: b.customerName || "Walk-in Customer",
        subtotal, discountAmount, taxAmount, deliveryFee, total,
        paymentMethod, amountTendered, changeDue,
        fulfillmentType, deliveryAddress: deliveryAddress || null, deliveryCity: deliveryCity || null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    console.error("pos sale edit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update sale" },
      { status: 400 }
    );
  } finally {
    if (conn) conn.release();
  }
}
