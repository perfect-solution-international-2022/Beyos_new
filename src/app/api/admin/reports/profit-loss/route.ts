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

// Same cost model as the Sales Report / Lost Profit Report, so figures stay
// comparable across reports: production_cost when recorded, else a 55% of
// unit-price estimate for customer/POS lines; reseller_price as cost for
// reseller lines (their markup is the profit).
const estimateCost = (unitPrice: number, prodCost: string | null) =>
  prodCost !== null ? Number(prodCost) : unitPrice * 0.55;

interface Line { slug: string; name: string; units: number; revenue: number; cost: number; date: string; }

export async function GET(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const { start, end } = parseRange(searchParams);

  try {
    // ---- Customer order line items ----
    const buyerLines = await query<{
      product_slug: string; name: string; quantity: number; unit_price: string;
      line_total: string; production_cost: string | null; order_date: string;
    }>(
      `SELECT oi.product_slug, oi.name, oi.quantity, oi.unit_price, oi.line_total,
              p.production_cost, DATE(o.created_at) AS order_date
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.slug = oi.product_slug
       WHERE DATE(o.created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const customerLines: Line[] = buyerLines.map((l) => ({
      slug: l.product_slug, name: l.name, units: l.quantity,
      revenue: Number(l.line_total),
      cost: estimateCost(Number(l.unit_price), l.production_cost) * l.quantity,
      date: l.order_date,
    }));

    // ---- Reseller order line items (profit already tracked at order level) ----
    const resellerLines = await query<{
      product_slug: string; name: string; quantity: number; line_total: string;
      reseller_price: string; order_date: string;
    }>(
      `SELECT roi.product_slug, roi.name, roi.quantity, roi.line_total,
              roi.reseller_price, DATE(ro.created_at) AS order_date
       FROM reseller_order_items roi
       JOIN reseller_orders ro ON ro.id = roi.order_id
       WHERE DATE(ro.created_at) BETWEEN ? AND ? AND ro.status <> 'rejected'`,
      [start, end]
    );
    const resellerLineRows: Line[] = resellerLines.map((l) => ({
      slug: l.product_slug, name: l.name, units: l.quantity,
      revenue: Number(l.line_total),
      cost: Number(l.reseller_price) * l.quantity,
      date: l.order_date,
    }));

    // ---- POS sale line items (completed sales only) ----
    const posLines = await query<{
      product_slug: string; name: string; quantity: number; unit_price: string;
      line_total: string; production_cost: string | null; sale_date: string;
    }>(
      `SELECT psi.product_slug, psi.name, psi.quantity, psi.unit_price, psi.line_total,
              p.production_cost, DATE(s.created_at) AS sale_date
       FROM pos_sale_items psi
       JOIN pos_sales s ON s.id = psi.sale_id
       LEFT JOIN products p ON p.slug = psi.product_slug
       WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?`,
      [start, end]
    );
    const posLineRows: Line[] = posLines.map((l) => ({
      slug: l.product_slug, name: l.name, units: l.quantity,
      revenue: Number(l.line_total),
      cost: estimateCost(Number(l.unit_price), l.production_cost) * l.quantity,
      date: l.sale_date,
    }));

    const sourceTotals = (lines: Line[]) => ({
      revenue: lines.reduce((s, l) => s + l.revenue, 0),
      cost: lines.reduce((s, l) => s + l.cost, 0),
      profit: lines.reduce((s, l) => s + (l.revenue - l.cost), 0),
    });
    const bySource = {
      customer: sourceTotals(customerLines),
      reseller: sourceTotals(resellerLineRows),
      pos: sourceTotals(posLineRows),
    };

    const allLines = [...customerLines, ...resellerLineRows, ...posLineRows];
    const totalRevenue = allLines.reduce((s, l) => s + l.revenue, 0);
    const totalCost = allLines.reduce((s, l) => s + l.cost, 0);
    const grossProfit = totalRevenue - totalCost;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // ---- Daily trend: revenue / cost / profit ----
    const trendMap = new Map<string, { revenue: number; cost: number }>();
    for (const l of allLines) {
      const cur = trendMap.get(l.date) ?? { revenue: 0, cost: 0 };
      cur.revenue += l.revenue;
      cur.cost += l.cost;
      trendMap.set(l.date, cur);
    }
    const trend = Array.from(trendMap.entries())
      .map(([date, v]) => ({ date, revenue: v.revenue, cost: v.cost, profit: v.revenue - v.cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ---- Product breakdown: revenue / cost / profit / margin ----
    const productMap = new Map<string, { name: string; units: number; revenue: number; cost: number }>();
    for (const l of allLines) {
      const cur = productMap.get(l.slug) ?? { name: l.name, units: 0, revenue: 0, cost: 0 };
      cur.units += l.units;
      cur.revenue += l.revenue;
      cur.cost += l.cost;
      productMap.set(l.slug, cur);
    }
    const productTable = Array.from(productMap.entries())
      .map(([slug, v]) => ({
        slug,
        name: v.name,
        units: v.units,
        revenue: v.revenue,
        cost: v.cost,
        profit: v.revenue - v.cost,
        marginPct: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    // ---- Operating expenses ----
    const expenseRows = await query<{ category: string; amount: string }>(
      `SELECT category, amount FROM expenses WHERE expense_date BETWEEN ? AND ?`,
      [start, end]
    );
    const expenseCatMap = new Map<string, number>();
    for (const e of expenseRows) expenseCatMap.set(e.category, (expenseCatMap.get(e.category) ?? 0) + Number(e.amount));
    const expensesByCategory = Array.from(expenseCatMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    const totalExpenses = expensesByCategory.reduce((s, e) => s + e.amount, 0);

    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      range: { start, end },
      summary: { totalRevenue, totalCost, grossProfit, grossMarginPct, totalExpenses, netProfit, netMarginPct },
      bySource,
      trend,
      productTable,
      expensesByCategory,
    });
  } catch (err) {
    console.error("admin profit-loss report error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
