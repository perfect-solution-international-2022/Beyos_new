import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

function parseRange(searchParams: URLSearchParams) {
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = searchParams.get("start") || startDefault.toISOString().slice(0, 10);
  return { start, end };
}

// Same cost model as the Sales Report's profit figure, so "lost profit" is
// directly comparable to "earned profit" — production_cost when recorded,
// else a 55% cost estimate for customer orders; reseller_price as cost for
// reseller orders (their markup is the profit).
const estimateCost = (unitPrice: number, prodCost: string | null) =>
  prodCost !== null ? Number(prodCost) : unitPrice * 0.55;

interface Row {
  source: "customer" | "reseller" | "pos";
  orderRef: string;
  reason: string;
  customerName: string;
  lostRevenue: number;
  lostProfit: number;
  cancelledDate: string;
}

export async function GET(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { start, end } = parseRange(searchParams);

  try {
    // ---- Cancelled customer orders ----
    const cancelledOrders = await query<{ id: number; order_ref: string; customer_name: string; total: string; created_at: string }>(
      `SELECT id, order_ref, customer_name, total, created_at
       FROM orders WHERE status = 'cancelled' AND DATE(created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const cancelledOrderIds = cancelledOrders.map((o) => o.id);
    const cancelledOrderItems = cancelledOrderIds.length
      ? await query<{ order_id: number; product_slug: string; quantity: number; unit_price: string; line_total: string; production_cost: string | null }>(
          `SELECT oi.order_id, oi.product_slug, oi.quantity, oi.unit_price, oi.line_total, p.production_cost
           FROM order_items oi LEFT JOIN products p ON p.slug = oi.product_slug
           WHERE oi.order_id IN (${cancelledOrderIds.map(() => "?").join(",")})`,
          cancelledOrderIds
        )
      : [];
    const profitByOrder = new Map<number, number>();
    for (const item of cancelledOrderItems) {
      const lt = Number(item.line_total);
      const cost = estimateCost(Number(item.unit_price), item.production_cost) * item.quantity;
      profitByOrder.set(item.order_id, (profitByOrder.get(item.order_id) ?? 0) + (lt - cost));
    }

    const customerRows: Row[] = cancelledOrders.map((o) => ({
      source: "customer",
      orderRef: o.order_ref,
      reason: "Cancelled",
      customerName: o.customer_name,
      lostRevenue: Number(o.total),
      lostProfit: profitByOrder.get(o.id) ?? 0,
      cancelledDate: o.created_at.toString().slice(0, 10),
    }));

    // ---- Rejected/cancelled reseller orders (profit tracked at order level already) ----
    const resellerOrders = await query<{ order_ref: string; customer_name: string; amount: string; profit: string; status: string; created_at: string }>(
      `SELECT order_ref, customer_name, amount, profit, status, created_at
       FROM reseller_orders WHERE status IN ('rejected','cancelled') AND DATE(created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const resellerRows: Row[] = resellerOrders.map((o) => ({
      source: "reseller",
      orderRef: o.order_ref,
      reason: o.status === "rejected" ? "Rejected" : "Cancelled",
      customerName: o.customer_name,
      lostRevenue: Number(o.amount),
      lostProfit: Number(o.profit),
      cancelledDate: o.created_at.toString().slice(0, 10),
    }));

    // ---- Cancelled POS delivery orders ----
    const posSales = await query<{ id: number; receipt_number: string; customer_name: string | null; total: string; created_at: string }>(
      `SELECT id, receipt_number, customer_name, total, created_at
       FROM pos_sales WHERE fulfillment_type = 'delivery' AND delivery_status = 'cancelled' AND DATE(created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const posSaleIds = posSales.map((s) => s.id);
    const posItems = posSaleIds.length
      ? await query<{ sale_id: number; product_slug: string; quantity: number; unit_price: string; line_total: string; production_cost: string | null }>(
          `SELECT psi.sale_id, psi.product_slug, psi.quantity, psi.unit_price, psi.line_total, p.production_cost
           FROM pos_sale_items psi LEFT JOIN products p ON p.slug = psi.product_slug
           WHERE psi.sale_id IN (${posSaleIds.map(() => "?").join(",")})`,
          posSaleIds
        )
      : [];
    const profitByPosSale = new Map<number, number>();
    for (const item of posItems) {
      const lt = Number(item.line_total);
      const cost = estimateCost(Number(item.unit_price), item.production_cost) * item.quantity;
      profitByPosSale.set(item.sale_id, (profitByPosSale.get(item.sale_id) ?? 0) + (lt - cost));
    }
    const posRows: Row[] = posSales.map((s) => ({
      source: "pos",
      orderRef: s.receipt_number,
      reason: "Delivery Cancelled",
      customerName: s.customer_name || "Walk-in Customer",
      lostRevenue: Number(s.total),
      lostProfit: profitByPosSale.get(s.id) ?? 0,
      cancelledDate: s.created_at.toString().slice(0, 10),
    }));

    const rows = [...customerRows, ...resellerRows, ...posRows].sort((a, b) => b.cancelledDate.localeCompare(a.cancelledDate));

    const totalLostRevenue = rows.reduce((s, r) => s + r.lostRevenue, 0);
    const totalLostProfit = rows.reduce((s, r) => s + r.lostProfit, 0);
    const totalCancelled = rows.length;

    const bySource = {
      customer: { count: customerRows.length, lostRevenue: customerRows.reduce((s, r) => s + r.lostRevenue, 0), lostProfit: customerRows.reduce((s, r) => s + r.lostProfit, 0) },
      reseller: { count: resellerRows.length, lostRevenue: resellerRows.reduce((s, r) => s + r.lostRevenue, 0), lostProfit: resellerRows.reduce((s, r) => s + r.lostProfit, 0) },
      pos: { count: posRows.length, lostRevenue: posRows.reduce((s, r) => s + r.lostRevenue, 0), lostProfit: posRows.reduce((s, r) => s + r.lostProfit, 0) },
    };

    // ---- Daily trend of lost profit ----
    const trendMap = new Map<string, number>();
    for (const r of rows) trendMap.set(r.cancelledDate, (trendMap.get(r.cancelledDate) ?? 0) + r.lostProfit);
    const trend = Array.from(trendMap.entries())
      .map(([date, value]) => ({ date, lostProfit: value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      range: { start, end },
      summary: { totalLostRevenue, totalLostProfit, totalCancelled },
      bySource,
      trend,
      rows,
    });
  } catch (err) {
    console.error("admin lost-profit report error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
