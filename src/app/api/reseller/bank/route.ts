import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireReseller } from "@/lib/reseller";

export async function GET() {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const rows = await query<{
      bank_name: string | null;
      account_name: string | null;
      account_number: string | null;
      bank_branch: string | null;
    }>(
      "SELECT bank_name, account_name, account_number, bank_branch FROM users WHERE id = ?",
      [reseller.id]
    );
    const b = rows[0] ?? {};
    return NextResponse.json({
      bank: {
        bankName: b.bank_name ?? "",
        accountName: b.account_name ?? "",
        accountNumber: b.account_number ?? "",
        branch: b.bank_branch ?? "",
      },
    });
  } catch (err) {
    console.error("bank GET error:", err);
    return NextResponse.json({ error: "Could not load bank details" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const reseller = await requireReseller();
  if (!reseller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const bankName = body.bankName?.trim() || null;
  const accountName = body.accountName?.trim() || null;
  const accountNumber = body.accountNumber?.trim() || null;
  const branch = body.branch?.trim() || null;

  if (!bankName || !accountName || !accountNumber) {
    return NextResponse.json(
      { error: "Bank name, account name and account number are required" },
      { status: 400 }
    );
  }

  try {
    await query(
      `UPDATE users SET bank_name = ?, account_name = ?, account_number = ?, bank_branch = ?
       WHERE id = ?`,
      [bankName, accountName, accountNumber, branch, reseller.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("bank PATCH error:", err);
    return NextResponse.json({ error: "Could not save bank details" }, { status: 500 });
  }
}
