import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { query } from "@/lib/db";
import { requestWaybill, submitOrder } from "@/lib/koombiyo";

interface PosSaleRow {
  receipt_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_phone_2: string | null;
  total: string;
  fulfillment_type: string | null;
  delivery_address: string | null;
  delivery_district_id: number | null;
  delivery_city: string | null;
  delivery_city_id: number | null;
  koombiyo_waybill_id: string | null;
  delivery_status: string | null;
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("sales");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { receiptNumber?: string; action?: "request-waybill" | "place-order"; specialNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.receiptNumber || !["request-waybill", "place-order"].includes(body.action || "")) {
    return NextResponse.json({ error: "Receipt number and action are required" }, { status: 400 });
  }

  try {
    const rows = await query<PosSaleRow>(
      `SELECT receipt_number, customer_name, customer_phone, customer_phone_2, total, fulfillment_type,
              delivery_address, delivery_district_id, delivery_city, delivery_city_id, koombiyo_waybill_id, delivery_status
       FROM pos_sales WHERE receipt_number = ? AND deleted_at IS NULL LIMIT 1`,
      [body.receiptNumber]
    );
    if (!rows.length) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    const sale = rows[0];
    if (sale.fulfillment_type !== "delivery") {
      return NextResponse.json({ error: "This sale is not a delivery order" }, { status: 400 });
    }
    if (sale.delivery_status !== "accepted") {
      return NextResponse.json({ error: "Accept this delivery order before requesting a waybill or submitting it to the courier" }, { status: 409 });
    }

    if (body.action === "request-waybill") {
      const waybillId = sale.koombiyo_waybill_id || (await requestWaybill());
      if (!sale.koombiyo_waybill_id) {
        await query(`UPDATE pos_sales SET koombiyo_waybill_id = ? WHERE receipt_number = ? AND deleted_at IS NULL`, [waybillId, sale.receipt_number]);
      }
      return NextResponse.json({ ok: true, waybillId });
    }

    if (!sale.koombiyo_waybill_id) {
      return NextResponse.json({ error: "Request a waybill ID before placing the order" }, { status: 400 });
    }
    if (!sale.customer_phone || !sale.delivery_address) {
      return NextResponse.json({ error: "Missing delivery details for this sale" }, { status: 400 });
    }
    const orderItems = await query<{ name: string; variation: string; sku: string }>(
      `SELECT name, TRIM(CONCAT_WS(' / ', NULLIF(size, ''), NULLIF(color, ''))) AS variation, sku
       FROM pos_sale_items WHERE sale_id = (SELECT id FROM pos_sales WHERE receipt_number = ? AND deleted_at IS NULL LIMIT 1)`,
      [sale.receipt_number]
    );
    const description = orderItems.map((item) =>
      [item.name, item.variation && `Variation: ${item.variation}`, `SKU: ${item.sku || "—"}`].filter(Boolean).join(" | ")
    ).join("; ");
    const response = await submitOrder({
      waybillId: sale.koombiyo_waybill_id,
      orderRef: sale.receipt_number,
      receiverName: sale.customer_name || "Walk-in Customer",
      receiverStreet: `${sale.delivery_address}${sale.delivery_city ? `, ${sale.delivery_city}` : ""}`,
      receiverPhone: sale.customer_phone,
      districtId: sale.delivery_district_id ?? undefined,
      cityId: sale.delivery_city_id ?? undefined,
      codAmount: 0,
      description,
      specialNote: [sale.customer_phone_2 ? `2nd phone: ${sale.customer_phone_2}` : "", body.specialNote || ""].filter(Boolean).join(" | "),
    });
    await query(
      `UPDATE pos_sales SET koombiyo_status = 'Booked', koombiyo_response = ?, koombiyo_updated_at = NOW(),
       delivery_status = 'out_for_delivery' WHERE receipt_number = ? AND deleted_at IS NULL`,
      [JSON.stringify(response), sale.receipt_number]
    );
    return NextResponse.json({ ok: true, waybillId: sale.koombiyo_waybill_id, courierStatus: "Booked", deliveryStatus: "out_for_delivery" });
  } catch (error) {
    console.error("POS Koombiyo action failed:", error);
    const message = error instanceof Error ? error.message : "Koombiyo request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
