"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface TrashItem { type: string; id: number; reference: string; name: string; deletedAt: string; }
const labels: Record<string, string> = { user: "User", product: "Product", customer_order: "Customer order", reseller_order: "Reseller order", pos_order: "POS order" };

export default function AdminTrashPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [restoring, setRestoring] = useState("");
  useEffect(() => { fetch("/api/admin/trash", { cache: "no-store" }).then((r) => r.json()).then((data) => setItems(data.items ?? [])).finally(() => setLoading(false)); }, []);
  const shown = useMemo(() => filter === "all" ? items : items.filter((item) => item.type === filter), [filter, items]);
  const restore = async (item: TrashItem) => {
    const key = `${item.type}:${item.id}`; setRestoring(key);
    try {
      const response = await fetch("/api/admin/trash", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: item.type, id: item.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not restore item");
      setItems((current) => current.filter((entry) => !(entry.type === item.type && entry.id === item.id))); toast(`${labels[item.type]} restored`);
    } catch (error) { toast(error instanceof Error ? error.message : "Could not restore item", "error"); } finally { setRestoring(""); }
  };
  return <div><div><h1 className="text-2xl font-bold text-navy-800">Trash</h1><p className="mt-1 text-sm text-navy-800/60">Archived records stay recoverable and are never permanently deleted.</p></div>
    <div className="mt-6 border border-navy-800/10 bg-white p-5"><select value={filter} onChange={(event) => setFilter(event.target.value)} className="input max-w-xs"><option value="all">All archived records</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}s</option>)}</select></div>
    <div className="mt-6 overflow-x-auto border border-navy-800/10 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-navy-800/10 text-xs font-semibold uppercase text-navy-800/55"><th className="px-5 py-4">Type</th><th className="px-5 py-4">Name</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Archived</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center">Loading...</td></tr> : shown.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-navy-800/55">Trash is empty</td></tr> : shown.map((item) => { const key = `${item.type}:${item.id}`; return <tr key={key} className="border-b border-navy-800/5"><td className="px-5 py-4"><span className="badge bg-navy-50 text-navy-800">{labels[item.type]}</span></td><td className="px-5 py-4 font-semibold text-navy-800">{item.name}</td><td className="px-5 py-4 text-navy-800/65">{item.reference}</td><td className="px-5 py-4 text-navy-800/65">{new Date(item.deletedAt).toLocaleString("en-GB")}</td><td className="px-5 py-4 text-right"><button disabled={restoring === key} onClick={() => restore(item)} className="rounded-lg border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-50">{restoring === key ? "Restoring..." : "Restore"}</button></td></tr>; })}</tbody></table></div>
  </div>;
}
