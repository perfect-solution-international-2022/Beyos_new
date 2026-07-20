import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller, makeRef, walletBalance } from "@/lib/reseller";

interface Row {
  withdraw_ref: string;
  amount: string;
  status: string;
  bank_snapshot: string;
  note: string | null;
  created_at: string;
}

export async function GET(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const conditions = ["reseller_id = ?"];
    const params: unknown[] = [reseller.id];
    if (status && status !== "all") {
      conditions.push("status = ?");
      params.push(status);
    }
    const rows = await query<Row>(
      `SELECT withdraw_ref, amount, status, bank_snapshot, note, created_at
       FROM withdrawals WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
      params
    );
    return NextResponse.json({
      withdrawals: rows.map((r) => ({
        withdrawRef: r.withdraw_ref,
        amount: Number(r.amount),
        status: r.status,
        bank: r.bank_snapshot,
        note: r.note,
        createdAt: r.created_at,
      })),
      balance: await walletBalance(reseller.id),
    });
  } catch (err) {
    console.error("withdrawals GET error:", err);
    return NextResponse.json({ error: "Could not load withdrawals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  try {
    const balance = await walletBalance(reseller.id);
    if (amount > balance) {
      return NextResponse.json(
        { error: "Amount exceeds your available balance" },
        { status: 400 }
      );
    }

    const bank = await query<{
      bank_name: string | null;
      account_name: string | null;
      account_number: string | null;
      bank_branch: string | null;
    }>(
      "SELECT bank_name, account_name, account_number, bank_branch FROM users WHERE id = ?",
      [reseller.id]
    );
    const b = bank[0];
    if (!b?.bank_name || !b?.account_number) {
      return NextResponse.json(
        { error: "Please add your bank details before withdrawing" },
        { status: 400 }
      );
    }
    const snapshot = `${b.bank_name} · ${b.account_name ?? ""} · ${b.account_number}`;

    const ref = makeRef("WD");
    await query(
      `INSERT INTO withdrawals (withdraw_ref, reseller_id, amount, status, bank_snapshot)
       VALUES (?,?,?,'pending',?)`,
      [ref, reseller.id, amount, snapshot]
    );
    return NextResponse.json({ success: true, withdrawRef: ref });
  } catch (err) {
    console.error("withdrawals POST error:", err);
    return NextResponse.json({ error: "Could not create withdrawal" }, { status: 500 });
  }
}
