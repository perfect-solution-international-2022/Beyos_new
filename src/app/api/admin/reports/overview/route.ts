import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

function parseRange(searchParams: URLSearchParams) {
  const end = searchParams.get("end") || new Date().toISOString().slice(0, 10);
  const startDefault = new Date();
  startDefault.setDate(startDefault.getDate() - 29);
  const start = searchParams.get("start") || startDefault.toISOString().slice(0, 10);
  return { start, end };
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { start, end } = parseRange(searchParams);

  try {
    // ---- Buyer order line items in range, joined to product cost/category ----
    const buyerLines = await query<{
      product_slug: string; name: string; category: string | null;
      quantity: number; unit_price: string; line_total: string;
      production_cost: string | null; order_date: string;
    }>(
      `SELECT oi.product_slug, oi.name, p.category, oi.quantity, oi.unit_price, oi.line_total,
              p.production_cost, DATE(o.created_at) AS order_date
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.slug = oi.product_slug
       WHERE DATE(o.created_at) BETWEEN ? AND ?`,
      [start, end]
    );

    // ---- Reseller order line items in range (profit already tracked at order level) ----
    const resellerLines = await query<{
      product_slug: string; name: string; category: string | null;
      quantity: number; selling_price: string; line_total: string;
      reseller_price: string; order_date: string;
    }>(
      `SELECT roi.product_slug, roi.name, p.category, roi.quantity, roi.selling_price, roi.line_total,
              roi.reseller_price, DATE(ro.created_at) AS order_date
       FROM reseller_order_items roi
       JOIN reseller_orders ro ON ro.id = roi.order_id
       LEFT JOIN products p ON p.slug = roi.product_slug
       WHERE DATE(ro.created_at) BETWEEN ? AND ? AND ro.status <> 'rejected'`,
      [start, end]
    );

    // ---- Order counts + status breakdown in range ----
    const buyerOrders = await query<{ id: number; total: string; status: string; created_at: string }>(
      `SELECT id, total, status, DATE(created_at) AS created_at FROM orders WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const resellerOrders = await query<{ id: number; amount: string; status: string; created_at: string }>(
      `SELECT id, amount, status, DATE(created_at) AS created_at FROM reseller_orders WHERE DATE(created_at) BETWEEN ? AND ? AND status <> 'rejected'`,
      [start, end]
    );

    const estimateCost = (unitPrice: number, prodCost: string | null) =>
      prodCost !== null ? Number(prodCost) : unitPrice * 0.55; // fallback estimate when no cost is recorded

    // ---- Summary ----
    let revenue = 0, profit = 0, unitsSold = 0, customerRevenue = 0, resellerRevenue = 0;
    for (const l of buyerLines) {
      const lt = Number(l.line_total);
      revenue += lt; customerRevenue += lt; unitsSold += l.quantity;
      profit += lt - estimateCost(Number(l.unit_price), l.production_cost) * l.quantity;
    }
    for (const l of resellerLines) {
      const lt = Number(l.line_total);
      revenue += lt; resellerRevenue += lt; unitsSold += l.quantity;
      profit += lt - Number(l.reseller_price) * l.quantity;
    }
    const totalOrders = buyerOrders.length + resellerOrders.length;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    // ---- Daily trend ----
    const trendMap = new Map<string, number>();
    for (const l of buyerLines) trendMap.set(l.order_date, (trendMap.get(l.order_date) ?? 0) + Number(l.line_total));
    for (const l of resellerLines) trendMap.set(l.order_date, (trendMap.get(l.order_date) ?? 0) + Number(l.line_total));
    const trend = Array.from(trendMap.entries())
      .map(([date, value]) => ({ date, revenue: value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const topSalesDay = trend.reduce(
      (best, d) => (d.revenue > (best?.revenue ?? -1) ? d : best),
      null as { date: string; revenue: number } | null
    );

    // ---- Top products by revenue ----
    const productMap = new Map<string, { name: string; revenue: number; units: number }>();
    for (const l of [...buyerLines, ...resellerLines]) {
      const cur = productMap.get(l.product_slug) ?? { name: l.name, revenue: 0, units: 0 };
      cur.revenue += Number(l.line_total);
      cur.units += l.quantity;
      productMap.set(l.product_slug, cur);
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    // ---- Category breakdown ----
    const catMap = new Map<string, number>();
    for (const l of [...buyerLines, ...resellerLines]) {
      const cat = l.category ?? "uncategorized";
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(l.line_total));
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, value]) => ({ category, revenue: value }))
      .sort((a, b) => b.revenue - a.revenue);

    // ---- Status breakdown ----
    const statusMap = new Map<string, number>();
    for (const o of buyerOrders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    for (const o of resellerOrders) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

    // ---- Full product table for the range ----
    const productTable = Array.from(productMap.entries())
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      range: { start, end },
      summary: {
        totalRevenue: revenue,
        totalOrders,
        avgOrderValue,
        totalProfit: profit,
        unitsSold,
        customerRevenue,
        resellerRevenue,
        topSalesDay: topSalesDay ? { date: topSalesDay.date, revenue: topSalesDay.revenue } : null,
      },
      trend,
      topProducts,
      categoryBreakdown,
      statusBreakdown,
      productTable,
    });
  } catch (err) {
    console.error("admin reports overview error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
