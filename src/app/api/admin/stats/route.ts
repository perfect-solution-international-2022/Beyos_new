import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Three parallel round trips replace the former ten sequential dashboard
    // queries while preserving the same figures.
    const [[revenue], [counts], weeklyRows] = await Promise.all([
      query<{ count: number; daily: string | null; monthly: string | null }>(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) AS daily,
                COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN amount ELSE 0 END), 0) AS monthly
         FROM (
           SELECT created_at, total AS amount FROM orders WHERE deleted_at IS NULL
           UNION ALL
           SELECT created_at, amount FROM reseller_orders WHERE deleted_at IS NULL
         ) combined_orders`
      ),
      query<{
        customers: number;
        pending_orders: number;
        pending_resellers: number;
        low_stock: number;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE role = 'buyer') AS customers,
           (SELECT COUNT(*) FROM orders WHERE status = 'pending' AND deleted_at IS NULL) +
             (SELECT COUNT(*) FROM reseller_orders WHERE status = 'pending' AND deleted_at IS NULL) AS pending_orders,
           (SELECT COUNT(*) FROM users WHERE role = 'reseller' AND reseller_status = 'pending') AS pending_resellers,
           (SELECT COUNT(*) FROM products WHERE product_type <> 'variable' AND stock <= low_stock_threshold AND is_publish = 1) +
             (SELECT COUNT(*) FROM product_variants WHERE stock <= low_stock_threshold) AS low_stock`
      ),
      query<{ dow: number; c: number }>(
        `SELECT dow, SUM(c) AS c FROM (
           SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS c FROM orders
           WHERE deleted_at IS NULL AND YEARWEEK(created_at, 0) = YEARWEEK(CURDATE(), 0) GROUP BY dow
           UNION ALL
           SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS c FROM reseller_orders
           WHERE deleted_at IS NULL AND YEARWEEK(created_at, 0) = YEARWEEK(CURDATE(), 0) GROUP BY dow
         ) weekly GROUP BY dow`
      ),
    ]);

    const week = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    for (const row of weeklyRows) week[Number(row.dow) - 1] = Number(row.c);

    return NextResponse.json({
      stats: {
        dailyRevenue: Number(revenue.daily),
        totalOrders: Number(revenue.count),
        totalCustomers: Number(counts.customers),
        monthlyRevenue: Number(revenue.monthly),
        pendingOrders: Number(counts.pending_orders),
        pendingResellers: Number(counts.pending_resellers),
        lowStockItems: Number(counts.low_stock),
      },
      weeklyOrders: week,
    });
  } catch (err) {
    console.error("admin stats error:", err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}
