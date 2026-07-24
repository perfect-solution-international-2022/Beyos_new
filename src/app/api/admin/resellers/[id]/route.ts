import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";
import { walletBalance } from "@/lib/reseller";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSection("people");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid reseller id" }, { status: 400 });
  }

  const rows = await query<{
    id: number;
    name: string;
    email: string;
    phone: string;
    city: string | null;
    reseller_status: string;
    allow_price_override: number;
    min_markup_pct: string;
    max_markup_pct: string | null;
    credit_limit: string;
    bank_name: string | null;
    account_name: string | null;
    account_number: string | null;
    bank_branch: string | null;
    created_at: string;
  }>(
    `SELECT id, name, email, phone, city, reseller_status, allow_price_override,
            min_markup_pct, max_markup_pct, credit_limit,
            bank_name, account_name, account_number, bank_branch, created_at
     FROM users WHERE id = ? AND role = 'reseller' LIMIT 1`,
    [id]
  );
  const reseller = rows[0];
  if (!reseller) return NextResponse.json({ error: "Reseller not found" }, { status: 404 });

  const [orderAgg] = await query<{ total: number; pending: number; sales: string | null }>(
    `SELECT COUNT(*) AS total, SUM(status = 'pending') AS pending,
            COALESCE(SUM(CASE WHEN status IN ('completed','delivered') THEN amount ELSE 0 END),0) AS sales
     FROM reseller_orders WHERE reseller_id = ?`,
    [id]
  );

  const orders = await query<{
    order_ref: string;
    customer_name: string;
    amount: string;
    profit: string;
    status: string;
    payment_status: string;
    created_at: string;
  }>(
    `SELECT order_ref, customer_name, amount, profit, status, payment_status, created_at
     FROM reseller_orders WHERE reseller_id = ? ORDER BY created_at DESC LIMIT 20`,
    [id]
  );

  const withdrawals = await query<{
    withdraw_ref: string;
    amount: string;
    status: string;
    note: string | null;
    created_at: string;
  }>(
    `SELECT withdraw_ref, amount, status, note, created_at
     FROM withdrawals WHERE reseller_id = ? ORDER BY created_at DESC LIMIT 20`,
    [id]
  );

  const ledger = await query<{
    type: "credit" | "debit" | "reversal";
    amount: string;
    reference_id: string;
    description: string | null;
    created_at: string;
  }>(
    `SELECT type, amount, reference_id, description, created_at
     FROM reseller_wallet_transactions WHERE reseller_id = ? ORDER BY created_at DESC, id DESC LIMIT 20`,
    [id]
  );

  const balance = await walletBalance(id);
  const pendingWithdrawals = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + Number(w.amount), 0);

  return NextResponse.json({
    reseller: {
      id: reseller.id,
      name: reseller.name,
      email: reseller.email,
      phone: reseller.phone,
      city: reseller.city,
      resellerStatus: reseller.reseller_status,
      allowPriceOverride: !!reseller.allow_price_override,
      minMarkupPct: Number(reseller.min_markup_pct),
      maxMarkupPct: reseller.max_markup_pct == null ? null : Number(reseller.max_markup_pct),
      creditLimit: Number(reseller.credit_limit),
      bank: {
        bankName: reseller.bank_name ?? "",
        accountName: reseller.account_name ?? "",
        accountNumber: reseller.account_number ?? "",
        branch: reseller.bank_branch ?? "",
      },
      createdAt: reseller.created_at,
    },
    stats: {
      totalOrders: Number(orderAgg?.total ?? 0),
      pendingOrders: Number(orderAgg?.pending ?? 0),
      totalSales: Number(orderAgg?.sales ?? 0),
      walletBalance: balance,
      pendingWithdrawals,
    },
    orders: orders.map((o) => ({
      orderRef: o.order_ref,
      customerName: o.customer_name,
      amount: Number(o.amount),
      profit: Number(o.profit),
      status: o.status,
      paymentStatus: o.payment_status,
      createdAt: o.created_at,
    })),
    withdrawals: withdrawals.map((w) => ({
      withdrawRef: w.withdraw_ref,
      amount: Number(w.amount),
      status: w.status,
      note: w.note,
      createdAt: w.created_at,
    })),
    transactions: ledger.map((t) => ({
      type: t.type,
      ref: t.reference_id,
      description: t.description || (t.type === "credit" ? "Order commission" : t.type === "reversal" ? "Withdrawal returned" : "Withdrawal"),
      amount: Number(t.amount),
      createdAt: t.created_at,
    })),
  });
}
