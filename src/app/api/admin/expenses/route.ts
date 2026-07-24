import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdminSection } from "@/lib/admin";

export async function GET(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  try {
    const where: string[] = [];
    const params: unknown[] = [];
    if (start) { where.push("expense_date >= ?"); params.push(start); }
    if (end) { where.push("expense_date <= ?"); params.push(end); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const rows = await query<{
      id: number; category: string; description: string; amount: string;
      expense_date: string; created_by_name: string | null; created_at: string;
    }>(
      `SELECT e.id, e.category, e.description, e.amount, e.expense_date, u.name AS created_by_name, e.created_at
       FROM expenses e LEFT JOIN users u ON u.id = e.created_by
       ${whereSql} ORDER BY e.expense_date DESC, e.id DESC`,
      params
    );

    return NextResponse.json({
      expenses: rows.map((r) => ({
        id: r.id,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        expenseDate: r.expense_date,
        createdBy: r.created_by_name,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("admin expenses GET error:", err);
    return NextResponse.json({ error: "Could not load expenses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const category = (b.category ?? "").trim();
  const description = (b.description ?? "").trim();
  const amount = Number(b.amount);
  const expenseDate = (b.expenseDate ?? "").trim();

  if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return NextResponse.json({ error: "Valid expense date is required" }, { status: 400 });

  try {
    await query(
      `INSERT INTO expenses (category, description, amount, expense_date, created_by) VALUES (?,?,?,?,?)`,
      [category, description, amount, expenseDate, admin.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin expenses POST error:", err);
    return NextResponse.json({ error: "Could not save expense" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const category = (b.category ?? "").trim();
  const description = (b.description ?? "").trim();
  const amount = Number(b.amount);
  const expenseDate = (b.expenseDate ?? "").trim();

  if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return NextResponse.json({ error: "Valid expense date is required" }, { status: 400 });

  try {
    await query(
      `UPDATE expenses SET category = ?, description = ?, amount = ?, expense_date = ? WHERE id = ?`,
      [category, description, amount, expenseDate, b.id]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin expenses PATCH error:", err);
    return NextResponse.json({ error: "Could not update expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSection("finance");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let b: any;
  try { b = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!b.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await query("DELETE FROM expenses WHERE id = ?", [b.id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin expenses DELETE error:", err);
    return NextResponse.json({ error: "Could not delete expense" }, { status: 500 });
  }
}
