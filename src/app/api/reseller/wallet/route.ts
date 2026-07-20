import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller, walletBalance } from "@/lib/reseller";

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const balance = await walletBalance(reseller.id);

    const credits = await query<{
      order_ref: string;
      profit: string;
      created_at: string;
    }>(
      `SELECT order_ref, profit, created_at FROM reseller_orders
       WHERE reseller_id = ? AND status = 'completed' ORDER BY created_at DESC`,
      [reseller.id]
    );
    const debits = await query<{
      withdraw_ref: string;
      amount: string;
      status: string;
      created_at: string;
    }>(
      `SELECT withdraw_ref, amount, status, created_at FROM withdrawals
       WHERE reseller_id = ? ORDER BY created_at DESC`,
      [reseller.id]
    );

    const transactions = [
      ...credits.map((c) => ({
        type: "credit" as const,
        ref: c.order_ref,
        label: "Order commission",
        amount: Number(c.profit),
        status: "completed",
        createdAt: c.created_at,
      })),
      ...debits.map((d) => ({
        type: "debit" as const,
        ref: d.withdraw_ref,
        label: "Withdrawal",
        amount: Number(d.amount),
        status: d.status,
        createdAt: d.created_at,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const pendingWithdrawals = debits
      .filter((d) => d.status === "pending")
      .reduce((s, d) => s + Number(d.amount), 0);

    return NextResponse.json({
      balance,
      pendingWithdrawals,
      lifetimeEarnings: credits.reduce((s, c) => s + Number(c.profit), 0),
      transactions,
    });
  } catch (err) {
    console.error("reseller wallet error:", err);
    return NextResponse.json({ error: "Could not load wallet" }, { status: 500 });
  }
}
