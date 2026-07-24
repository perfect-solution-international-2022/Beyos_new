import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller, walletBalance } from "@/lib/reseller";

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [agg] = await query<{
      total: number;
      pending: number;
      sales: string | null;
    }>(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END),0) AS sales
       FROM reseller_orders WHERE reseller_id = ?`,
      [reseller.id]
    );

    const recent = await query<{
      order_ref: string;
      amount: string;
      status: string;
      created_at: string;
    }>(
      `SELECT ro.order_ref, ro.amount, ro.status, ro.created_at
       FROM reseller_orders ro WHERE ro.reseller_id = ?
       ORDER BY ro.created_at DESC LIMIT 5`,
      [reseller.id]
    );

    // Attach quantities for the recent list.
    let qtyByRef = new Map<string, number>();
    if (recent.length) {
      const refs = recent.map((r) => r.order_ref);
      const ph = refs.map(() => "?").join(",");
      const rows = await query<{ order_ref: string; qty: number }>(
        `SELECT ro.order_ref, COALESCE(SUM(i.quantity),0) AS qty
         FROM reseller_orders ro
         JOIN reseller_order_items i ON i.order_id = ro.id
         WHERE ro.order_ref IN (${ph}) GROUP BY ro.order_ref`,
        refs
      );
      qtyByRef = new Map(rows.map((r) => [r.order_ref, Number(r.qty)]));
    }

    const wallet = await walletBalance(reseller.id);

    return NextResponse.json({
      stats: {
        totalSales: Number(agg?.sales ?? 0),
        myOrders: Number(agg?.total ?? 0),
        pendingOrders: Number(agg?.pending ?? 0),
        walletBalance: wallet,
      },
      recent: recent.map((r) => ({
        orderRef: r.order_ref,
        amount: Number(r.amount),
        status: r.status,
        quantity: qtyByRef.get(r.order_ref) ?? 0,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("reseller stats error:", err);
    return NextResponse.json({ error: "Could not load stats" }, { status: 500 });
  }
}
