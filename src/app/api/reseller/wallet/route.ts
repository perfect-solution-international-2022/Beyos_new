import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller, walletBalance } from "@/lib/reseller";

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const balance = await walletBalance(reseller.id);

    const credits = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0) AS total FROM reseller_wallet_transactions
       WHERE reseller_id = ? AND type = 'credit' AND reference_type = 'order'`, [reseller.id]
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

    const ledger = await query<{ type: "credit" | "debit" | "reversal"; amount: string; reference_id: string; description: string; created_at: string }>(
      `SELECT type, amount, reference_id, description, created_at FROM reseller_wallet_transactions
       WHERE reseller_id = ? ORDER BY created_at DESC, id DESC`, [reseller.id]
    );
    const withdrawalStatus = new Map(debits.map((item) => [item.withdraw_ref, item.status]));
    const transactions = ledger.map((item) => ({
      type: item.type === "debit" ? "debit" as const : "credit" as const,
      ref: item.reference_id,
      label: item.description || (item.type === "credit" ? "Order commission" : item.type === "reversal" ? "Withdrawal returned" : "Withdrawal"),
      amount: Number(item.amount),
      status: item.type === "debit" ? (withdrawalStatus.get(item.reference_id) ?? "pending") : "completed",
      createdAt: item.created_at,
    }));

    const pendingWithdrawals = debits
      .filter((d) => d.status === "pending")
      .reduce((s, d) => s + Number(d.amount), 0);

    return NextResponse.json({
      balance,
      pendingWithdrawals,
      lifetimeEarnings: Number(credits[0]?.total ?? 0),
      transactions,
    });
  } catch (err) {
    console.error("reseller wallet error:", err);
    return NextResponse.json({ error: "Could not load wallet" }, { status: 500 });
  }
}
