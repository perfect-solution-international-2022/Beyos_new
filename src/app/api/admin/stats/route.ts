import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Revenue combines buyer orders (total) and reseller orders (amount).
    const [buyerAgg] = await query<{
      count: number;
      daily: string | null;
      monthly: string | null;
    }>(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total ELSE 0 END),0) AS daily,
              COALESCE(SUM(CASE WHEN YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE()) THEN total ELSE 0 END),0) AS monthly
       FROM orders`
    );
    const [resellerAgg] = await query<{
      count: number;
      daily: string | null;
      monthly: string | null;
    }>(
      `SELECT COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN amount ELSE 0 END),0) AS daily,
              COALESCE(SUM(CASE WHEN YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE()) THEN amount ELSE 0 END),0) AS monthly
       FROM reseller_orders`
    );
    const [cust] = await query<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'buyer'"
    );

    // Weekly order counts (this week, Sun–Sat) from both tables.
    const weekBuyer = await query<{ dow: number; c: number }>(
      `SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS c FROM orders
       WHERE YEARWEEK(created_at, 0) = YEARWEEK(CURDATE(), 0) GROUP BY dow`
    );
    const weekReseller = await query<{ dow: number; c: number }>(
      `SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS c FROM reseller_orders
       WHERE YEARWEEK(created_at, 0) = YEARWEEK(CURDATE(), 0) GROUP BY dow`
    );
    const week = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    for (const r of [...weekBuyer, ...weekReseller]) week[Number(r.dow) - 1] += Number(r.c);

    return NextResponse.json({
      stats: {
        dailyRevenue: Number(buyerAgg.daily) + Number(resellerAgg.daily),
        totalOrders: Number(buyerAgg.count) + Number(resellerAgg.count),
        totalCustomers: Number(cust.count),
        monthlyRevenue: Number(buyerAgg.monthly) + Number(resellerAgg.monthly),
      },
      weeklyOrders: week,
    });
  } catch (err) {
    console.error("admin stats error:", err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}
