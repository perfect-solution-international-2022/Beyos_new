import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { sendOrderStatusSms } from "@/lib/sms";

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
        items: items.map((i: any) => ({
          name: i.name, sku: i.sku, size: i.size, color: i.color,
          quantity: i.quantity, unitPrice: Number(i.unit_price), lineTotal: Number(i.line_total),
        })),
        subtotal: Number(sale.subtotal),
        discountAmount: Number(sale.discount_amount),
        taxAmount: Number(sale.tax_amount),
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

const DELIVERY_STATUSES = ["pending", "out_for_delivery", "delivered"];

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
    const rows = await query<{ id: number; fulfillment_type: string; customer_phone: string | null; delivery_status: string | null }>(
      "SELECT id, fulfillment_type, customer_phone, delivery_status FROM pos_sales WHERE receipt_number = ? LIMIT 1",
      [receiptNumber]
    );
    const sale = rows[0];
    if (!sale) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    if (sale.fulfillment_type !== "delivery") {
      return NextResponse.json({ error: "This sale is not a delivery order" }, { status: 400 });
    }

    await query("UPDATE pos_sales SET delivery_status = ? WHERE id = ?", [b.deliveryStatus, sale.id]);
    if (sale.delivery_status !== b.deliveryStatus) {
      await sendOrderStatusSms(sale.customer_phone, receiptNumber, b.deliveryStatus);
    }
    return NextResponse.json({ ok: true, deliveryStatus: b.deliveryStatus });
  } catch (err) {
    console.error("pos delivery status PATCH error:", err);
    return NextResponse.json({ error: "Could not update delivery status" }, { status: 500 });
  }
}
