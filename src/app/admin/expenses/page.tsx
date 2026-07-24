"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastProvider";
import { formatPrice } from "@/lib/utils";

const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Marketing",
  "Delivery & Logistics",
  "Packaging",
  "Software & Subscriptions",
  "Maintenance",
  "Other",
];

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  createdBy: string | null;
  createdAt: string;
}
interface ExpenseForm {
  id: number;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

const blank = (): ExpenseForm => ({ id: 0, category: EXPENSE_CATEGORIES[0], description: "", amount: "", expenseDate: toISODate(new Date()) });

export default function AdminExpensesPage() {
  const { toast, confirm } = useToast();
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(toISODate(new Date()));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ExpenseForm | null>(null);

  const load = (s: string, e: string) => {
    setLoading(true);
    fetch(`/api/admin/expenses?start=${s}&end=${e}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setExpenses(d.expenses ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(start, end), []); // eslint-disable-line

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const edit = (expense: Expense) =>
    setEditing({ id: expense.id, category: expense.category, description: expense.description, amount: String(expense.amount), expenseDate: expense.expenseDate.slice(0, 10) });

  const del = async (expense: Expense) => {
    const ok = await confirm({
      title: "Delete expense?",
      message: `Delete the ${expense.category} expense of ${formatPrice(expense.amount)}?`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch("/api/admin/expenses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: expense.id }) });
    if (!res.ok) { toast("Could not delete expense", "error"); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    toast("Expense deleted");
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Expenses</h1>
          <p className="mt-1 text-sm text-navy-800/55">Record operating expenses so the Profit &amp; Loss report reflects true net profit.</p>
        </div>
        <button onClick={() => setEditing(blank())} className="btn-primary shrink-0">+ Add Expense</button>
      </div>

      {/* Date range controls */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">Start Date</label>
          <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-800/50">End Date</label>
          <input type="date" value={end} min={start} max={toISODate(new Date())} onChange={(e) => setEnd(e.target.value)} className="input" />
        </div>
        <button onClick={() => load(start, end)} className="btn-primary">Apply</button>
        <div className="ml-auto rounded-full bg-navy-50 px-4 py-2 text-sm">
          <span className="text-navy-800/60">Total: </span>
          <span className="font-bold text-navy-800">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Recorded By</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-navy-800/50">No expenses recorded in this range.</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-5 py-3 text-navy-800/70">{new Date(e.expenseDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-5 py-3"><span className="badge bg-navy-50 text-navy-800/70">{e.category}</span></td>
                  <td className="px-5 py-3 text-navy-800/70">{e.description || "—"}</td>
                  <td className="px-5 py-3 font-semibold text-navy-800">{formatPrice(e.amount)}</td>
                  <td className="px-5 py-3 text-navy-800/50">{e.createdBy || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => edit(e)} className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100">Edit</button>
                      <button onClick={() => del(e)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ExpenseModal
          data={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(start, end); toast("Expense saved"); }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ data, onClose, onSaved }: { data: ExpenseForm; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = form.id > 0;

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Save failed");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">{isEdit ? "Edit Expense" : "Add Expense"}</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Category</label>
            <select value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} className="input">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Description (optional)</label>
            <input value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="input" placeholder="e.g. July shop rent" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Amount (LKR)</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className="input" placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">Date</label>
              <input type="date" value={form.expenseDate} max={toISODate(new Date())} onChange={(e) => setForm((c) => ({ ...c, expenseDate: e.target.value }))} className="input" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save Expense"}</button>
        </div>
      </div>
    </div>
  );
}
