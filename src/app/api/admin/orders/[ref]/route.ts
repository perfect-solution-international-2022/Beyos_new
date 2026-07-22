import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { ref } = await params;

  const buyerRows = await query<any>(`SELECT * FROM orders WHERE order_ref = ? LIMIT 1`, [ref]);
  if (buyerRows[0]) {
    const o = buyerRows[0];
    const items = await query<any>(`SELECT * FROM order_items WHERE order_id = ?`, [o.id]);
    return NextResponse.json({
      order: {
        type: "customer",
        orderRef: o.order_ref,
        status: o.status,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        paymentRef: o.payment_ref,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        total: Number(o.total),
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        address: o.address,
        city: o.city,
        postalCode: o.postal_code,
        koombiyoWaybillId: o.koombiyo_waybill_id,
        koombiyoStatus: o.koombiyo_status,
        koombiyoUpdatedAt: o.koombiyo_updated_at,
        createdAt: o.created_at,
        items: items.map((i) => ({
          name: i.name, size: i.size, color: i.color,
          quantity: i.quantity, unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total),
        })),
      },
    });
  }

  const resellerRows = await query<any>(
    `SELECT ro.*, u.name AS reseller_name, u.email AS reseller_email
     FROM reseller_orders ro JOIN users u ON u.id = ro.reseller_id
     WHERE ro.order_ref = ? LIMIT 1`,
    [ref]
  );
  if (resellerRows[0]) {
    const o = resellerRows[0];
    const items = await query<any>(`SELECT * FROM reseller_order_items WHERE order_id = ?`, [o.id]);
    return NextResponse.json({
      order: {
        type: "reseller",
        orderRef: o.order_ref,
        status: o.status,
        rejectReason: o.reject_reason,
        paymentMethod: "reseller",
        paymentStatus: o.payment_status,
        subtotal: Number(o.subtotal),
        shipping: Number(o.delivery_fee),
        total: Number(o.amount),
        cost: Number(o.cost),
        profit: Number(o.profit),
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        address: [o.address_line1, o.address_line2].filter(Boolean).join(", ") || o.customer_address,
        city: o.city,
        district: o.district,
        province: o.province,
        postalCode: o.postal_code,
        notes: o.notes,
        resellerName: o.reseller_name,
        resellerEmail: o.reseller_email,
        koombiyoWaybillId: o.koombiyo_waybill_id,
        koombiyoStatus: o.koombiyo_status,
        koombiyoUpdatedAt: o.koombiyo_updated_at,
        createdAt: o.created_at,
        items: items.map((i) => ({
          name: i.name, size: i.variant_summary, color: "",
          quantity: i.quantity, unitPrice: Number(i.selling_price), lineTotal: Number(i.line_total),
        })),
      },
    });
  }

  const posRows = await query<any>(
    `SELECT s.*, c.name AS cashier_name FROM pos_sales s
     JOIN pos_cashiers c ON c.id = s.cashier_id WHERE s.receipt_number = ? LIMIT 1`,
    [ref]
  );
  if (posRows[0]) {
    const o = posRows[0];
    const items = await query<any>(`SELECT * FROM pos_sale_items WHERE sale_id = ?`, [o.id]);
    return NextResponse.json({
      order: {
        type: "pos",
        orderRef: o.receipt_number,
        status: o.status,
        paymentMethod: `pos_${o.payment_method}`,
        paymentStatus: "paid",
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discount_amount),
        taxAmount: Number(o.tax_amount),
        total: Number(o.total),
        amountTendered: o.amount_tendered !== null ? Number(o.amount_tendered) : null,
        changeDue: o.change_due !== null ? Number(o.change_due) : null,
        customerName: o.customer_name || "Walk-in Customer",
        customerPhone: o.customer_phone,
        fulfillmentType: o.fulfillment_type || "pickup",
        deliveryAddress: o.delivery_address,
        deliveryCity: o.delivery_city,
        deliveryStatus: o.delivery_status,
        koombiyoWaybillId: o.koombiyo_waybill_id,
        koombiyoStatus: o.koombiyo_status,
        cashierName: o.cashier_name,
        createdAt: o.created_at,
        items: items.map((i) => ({
          name: i.name, size: i.size, color: i.color,
          quantity: i.quantity, unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total),
        })),
      },
    });
  }

  return NextResponse.json({ error: "Order not found" }, { status: 404 });
}
