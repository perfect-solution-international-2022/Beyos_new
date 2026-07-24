import { NextResponse } from "next/server";
import { requireAdminSection } from "@/lib/admin";
import { query } from "@/lib/db";
import { requestWaybill, submitOrder } from "@/lib/koombiyo";

interface PosSaleRow {
  receipt_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: string;
  fulfillment_type: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  koombiyo_waybill_id: string | null;
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
      `SELECT receipt_number, customer_name, customer_phone, total, fulfillment_type,
              delivery_address, delivery_city, koombiyo_waybill_id
       FROM pos_sales WHERE receipt_number = ? LIMIT 1`,
      [body.receiptNumber]
    );
    if (!rows.length) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    const sale = rows[0];
    if (sale.fulfillment_type !== "delivery") {
      return NextResponse.json({ error: "This sale is not a delivery order" }, { status: 400 });
    }

    if (body.action === "request-waybill") {
      const waybillId = sale.koombiyo_waybill_id || (await requestWaybill());
      if (!sale.koombiyo_waybill_id) {
        await query(`UPDATE pos_sales SET koombiyo_waybill_id = ? WHERE receipt_number = ?`, [waybillId, sale.receipt_number]);
      }
      return NextResponse.json({ ok: true, waybillId });
    }

    if (!sale.koombiyo_waybill_id) {
      return NextResponse.json({ error: "Request a waybill ID before placing the order" }, { status: 400 });
    }
    if (!sale.customer_phone || !sale.delivery_address) {
      return NextResponse.json({ error: "Missing delivery details for this sale" }, { status: 400 });
    }
    const response = await submitOrder({
      waybillId: sale.koombiyo_waybill_id,
      orderRef: sale.receipt_number,
      receiverName: sale.customer_name || "Walk-in Customer",
      receiverStreet: `${sale.delivery_address}${sale.delivery_city ? `, ${sale.delivery_city}` : ""}`,
      receiverPhone: sale.customer_phone,
      codAmount: 0,
      specialNote: body.specialNote,
    });
    await query(
      `UPDATE pos_sales SET koombiyo_status = 'Booked', koombiyo_response = ?, koombiyo_updated_at = NOW(),
       delivery_status = 'out_for_delivery' WHERE receipt_number = ?`,
      [JSON.stringify(response), sale.receipt_number]
    );
    return NextResponse.json({ ok: true, waybillId: sale.koombiyo_waybill_id, courierStatus: "Booked", deliveryStatus: "out_for_delivery" });
  } catch (error) {
    console.error("POS Koombiyo action failed:", error);
    const message = error instanceof Error ? error.message : "Koombiyo request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
