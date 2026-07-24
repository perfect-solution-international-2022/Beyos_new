import { NextResponse } from "next/server";
import { pool, query } from "@/lib/db";
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
  if (!amount || amount < 1000) {
    return NextResponse.json({ error: "Minimum withdrawal amount is LKR 1,000" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [reseller.id]);
    const [pendingRows] = await conn.execute(
      "SELECT id FROM withdrawals WHERE reseller_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE", [reseller.id]
    );
    if ((pendingRows as unknown[]).length) {
      await conn.rollback();
      return NextResponse.json({ error: "You already have a pending withdrawal request" }, { status: 400 });
    }
    const [earnedRows] = await conn.execute(
      "SELECT COALESCE(SUM(profit),0) AS total FROM reseller_orders WHERE reseller_id = ? AND status IN ('completed','delivered')", [reseller.id]
    );
    const [withdrawnRows] = await conn.execute(
      "SELECT COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE reseller_id = ? AND status <> 'rejected'", [reseller.id]
    );
    const balance = Number((earnedRows as any[])[0]?.total ?? 0) - Number((withdrawnRows as any[])[0]?.total ?? 0);
    if (amount > balance) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Amount exceeds your available balance" },
        { status: 400 }
      );
    }

    const [bankRows] = await conn.execute(
      "SELECT bank_name, account_name, account_number, bank_branch FROM users WHERE id = ?", [reseller.id]
    );
    const b = (bankRows as {
      bank_name: string | null;
      account_name: string | null;
      account_number: string | null;
      bank_branch: string | null;
    }[])[0];
    if (!b?.bank_name || !b?.account_number) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Please add your bank details before withdrawing" },
        { status: 400 }
      );
    }
    const snapshot = `${b.bank_name} · ${b.account_name ?? ""} · ${b.account_number}`;

    const ref = makeRef("WD");
    await conn.execute(
      `INSERT INTO withdrawals (withdraw_ref, reseller_id, amount, status, bank_snapshot)
       VALUES (?,?,?,'pending',?)`,
      [ref, reseller.id, amount, snapshot]
    );
    await conn.execute(
      `INSERT INTO reseller_wallet_transactions
       (reseller_id, type, amount, reference_type, reference_id, description)
       VALUES (?,'debit',?,'withdrawal',?,'Withdrawal requested')`, [reseller.id, amount, ref]
    );
    await conn.commit();
    return NextResponse.json({ success: true, withdrawRef: ref });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("withdrawals POST error:", err);
    return NextResponse.json({ error: "Could not create withdrawal" }, { status: 500 });
  } finally { conn.release(); }
}
