import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Units sold + revenue per product name, across buyer and reseller orders.
    const rows = await query<{ name: string; qty: string; revenue: string }>(
      `SELECT name, SUM(qty) AS qty, SUM(revenue) AS revenue FROM (
         SELECT name, SUM(quantity) AS qty, SUM(line_total) AS revenue
         FROM order_items GROUP BY name
         UNION ALL
         SELECT name, SUM(quantity) AS qty, SUM(line_total) AS revenue
         FROM reseller_order_items GROUP BY name
       ) t GROUP BY name ORDER BY qty DESC`
    );
    return NextResponse.json({
      items: rows.map((r) => ({ name: r.name, quantity: Number(r.qty), revenue: Number(r.revenue) })),
    });
  } catch (err) {
    console.error("admin item report error:", err);
    return NextResponse.json({ error: "Could not load report" }, { status: 500 });
  }
}
