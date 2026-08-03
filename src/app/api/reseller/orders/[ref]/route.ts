import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller } from "@/lib/reseller";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ref = decodeURIComponent((await params).ref).trim();
  if (!ref) return NextResponse.json({ error: "Invalid order reference" }, { status: 400 });

  try {
    const orders = await query<any>(
      `SELECT id, order_ref, customer_name, customer_phone, customer_phone_2, customer_email,
              customer_address, address_line1, address_line2, province, district, city, postal_code, notes,
              subtotal, delivery_fee, amount, cost, profit, status, reject_reason, payment_status,
              koombiyo_waybill_id, koombiyo_status, koombiyo_updated_at, created_at
       FROM reseller_orders
       WHERE order_ref = ? AND reseller_id = ? AND deleted_at IS NULL LIMIT 1`,
      [ref, reseller.id]
    );
    const order = orders[0];
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const items = await query<any>(
      `SELECT roi.product_slug, roi.variant_summary, roi.sku, roi.name, roi.quantity,
              roi.reseller_price, roi.selling_price, roi.line_total,
              COALESCE(pv.image, p.image) AS image
       FROM reseller_order_items roi
       LEFT JOIN products p ON p.id = roi.product_id
       LEFT JOIN product_variants pv ON pv.id = roi.variant_id
       WHERE roi.order_id = ? ORDER BY roi.id ASC`,
      [order.id]
    );

    return NextResponse.json({
      order: {
        orderRef: order.order_ref,
        customer: {
          name: order.customer_name, phone: order.customer_phone, phone2: order.customer_phone_2,
          email: order.customer_email, address: order.customer_address, addressLine1: order.address_line1,
          addressLine2: order.address_line2, province: order.province, district: order.district,
          city: order.city, postalCode: order.postal_code,
        },
        notes: order.notes,
        subtotal: Number(order.subtotal), deliveryFee: Number(order.delivery_fee), amount: Number(order.amount),
        cost: Number(order.cost), profit: Number(order.profit), status: order.status,
        rejectReason: order.reject_reason, paymentStatus: order.payment_status,
        waybillNumber: order.koombiyo_waybill_id, courierStatus: order.koombiyo_status,
        courierUpdatedAt: order.koombiyo_updated_at, createdAt: order.created_at,
        items: items.map((item) => ({
          slug: item.product_slug, name: item.name, sku: item.sku, variant: item.variant_summary,
          image: item.image, quantity: Number(item.quantity), resellerPrice: Number(item.reseller_price),
          sellingPrice: Number(item.selling_price), lineTotal: Number(item.line_total),
          profit: (Number(item.selling_price) - Number(item.reseller_price)) * Number(item.quantity),
        })),
      },
    });
  } catch (error) {
    console.error("reseller order detail error:", error);
    return NextResponse.json({ error: "Could not load order details" }, { status: 500 });
  }
}
