import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { makeReceiptNumber } from "@/lib/pos";
import type { PoolConnection } from "mysql2/promise";
import { sendOrderConfirmationSms } from "@/lib/sms";
import { computeDeliveryFee, getDeliveryPricing } from "@/lib/shipping";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push("(s.receipt_number LIKE ? OR s.customer_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await query<any>(
      `SELECT s.*, c.name AS cashier_name FROM pos_sales s
       JOIN pos_cashiers c ON c.id = s.cashier_id ${where}
       ORDER BY s.created_at DESC LIMIT 200`,
      params
    );
    return NextResponse.json({
      sales: rows.map((r: any) => ({
        receiptNumber: r.receipt_number,
        cashierName: r.cashier_name,
        customerName: r.customer_name,
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discount_amount),
        taxAmount: Number(r.tax_amount),
        deliveryFee: Number(r.delivery_fee || 0),
        total: Number(r.total),
        paymentMethod: r.payment_method,
        status: r.status,
        fulfillmentType: r.fulfillment_type ?? "pickup",
        deliveryAddress: r.delivery_address,
        deliveryCity: r.delivery_city,
        deliveryStatus: r.delivery_status,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("pos sales GET error:", err);
    return NextResponse.json({ error: "Could not load sales" }, { status: 500 });
  }
}

interface SaleLine {
  slug: string;
  variantId?: number | null;
  size: string;
  color: string;
  quantity: number;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let b: {
    items?: SaleLine[];
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
    // Confirm this shift is really open and belongs to this cashier.
    // Recompute every line from the live product catalog — never trust client prices.
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Keep one internal session for the existing POS foreign keys. Cashiers and
    // shifts are no longer part of the admin-facing register workflow.
    const [cashierRows] = await conn.execute(
      "SELECT id FROM pos_cashiers WHERE name = '__BEYOS_POS__' ORDER BY id ASC LIMIT 1"
    );
    let cashierId = Number((cashierRows as any[])[0]?.id ?? 0);
    if (!cashierId) {
      const [cashierResult] = await conn.execute(
        "INSERT INTO pos_cashiers (name, pin_hash, is_active) VALUES ('__BEYOS_POS__', 'disabled', 0)"
      );
      cashierId = Number((cashierResult as any).insertId);
    }

    const [shiftRows] = await conn.execute(
      "SELECT id FROM pos_shifts WHERE cashier_id = ? AND status = 'open' ORDER BY id ASC LIMIT 1",
      [cashierId]
    );
    let shiftId = Number((shiftRows as any[])[0]?.id ?? 0);
    if (!shiftId) {
      const [shiftResult] = await conn.execute(
        "INSERT INTO pos_shifts (cashier_id, opening_float, status) VALUES (?, 0, 'open')",
        [cashierId]
      );
      shiftId = Number((shiftResult as any).insertId);
    }

    let subtotal = 0;
    let totalWeightKg = 0;
    const lineItems: {
      slug: string; variantId: number | null; sku: string; name: string; size: string; color: string;
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

      let variant: any = null;
      if (line.variantId) {
        const [variantRows] = await conn.execute(
          "SELECT id, sku, price, stock, attribute_summary FROM product_variants WHERE id = ? AND product_id = ? LIMIT 1 FOR UPDATE",
          [line.variantId, product.id]
        );
        variant = (variantRows as any[])[0];
        if (!variant) throw new Error(`The selected option for ${product.name} is unavailable`);
        if (variant.stock < qty) {
          throw new Error(`Not enough stock for ${product.name} (${variant.attribute_summary}) — ${variant.stock} left`);
        }
      } else if (product.stock < qty) {
        throw new Error(`Not enough stock for ${product.name} (${product.stock} left)`);
      }

      const unitPrice = Number(variant?.price ?? product.price);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      totalWeightKg += Number(product.weight_kg || 0) * qty;
      lineItems.push({
        slug: product.slug, variantId: variant?.id ?? null, sku: variant?.sku || product.sku, name: product.name,
        size: line.size || variant?.attribute_summary || "", color: line.color || "",
        quantity: qty, unitPrice, lineTotal,
      });

      if (variant) {
        await conn.execute("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [qty, variant.id]);
        await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, product.id]);
      } else {
        await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, product.id]);
      }
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

    const receiptNumber = makeReceiptNumber();
    const deliveryStatus = fulfillmentType === "delivery" ? "pending" : null;
    const [saleResult] = await conn.execute(
      `INSERT INTO pos_sales
        (receipt_number, shift_id, cashier_id, customer_name, customer_phone,
         subtotal, discount_amount, tax_amount, total, payment_method, amount_tendered, change_due, status,
         fulfillment_type, delivery_address, delivery_city, delivery_status, delivery_fee)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'completed',?,?,?,?,?)`,
      [
        receiptNumber, shiftId, cashierId,
        (b.customerName ?? "").trim() || null, (b.customerPhone ?? "").trim() || null,
        subtotal, discountAmount, taxAmount, total, paymentMethod, amountTendered, changeDue,
        fulfillmentType, deliveryAddress || null, deliveryCity || null, deliveryStatus, deliveryFee,
      ]
    );
    const saleId = (saleResult as any).insertId;

    for (const li of lineItems) {
      await conn.execute(
        `INSERT INTO pos_sale_items (sale_id, product_slug, variant_id, sku, name, size, color, quantity, unit_price, line_total)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [saleId, li.slug, li.variantId, li.sku, li.name, li.size, li.color, li.quantity, li.unitPrice, li.lineTotal]
      );
    }

    await conn.commit();

    await sendOrderConfirmationSms({
      phone: b.customerPhone,
      orderRef: receiptNumber,
      total,
      status: fulfillmentType === "delivery" ? "pending" : "completed",
    });

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
    console.error("pos sale create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not complete sale" },
      { status: 400 }
    );
  } finally {
    if (conn) conn.release();
  }
}
