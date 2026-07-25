"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Movement {
  id: number; productName: string; sku: string; variantId: number | null; movementType: string;
  before: number; change: number; after: number; referenceType: string | null; referenceId: string | null;
  note: string | null; createdBy: string | null; createdAt: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("all");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ search, direction, type });
      fetch(`/api/admin/inventory/movements?${params}`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.json()).then((data) => setMovements(data.movements ?? []))
        .finally(() => setLoading(false));
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, direction, type]);

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-navy-800">Stock Movement Ledger</h1><p className="mt-1 text-sm text-navy-800/50">Every recorded inventory increase, decrease and manual adjustment.</p></div><Link href="/admin/inventory" className="rounded-lg border border-navy-800/15 px-4 py-2 text-sm font-semibold text-navy-800 hover:border-brand hover:text-brand">Adjust inventory</Link></div>
    <div className="mt-6 flex flex-col gap-3 border border-navy-800/10 bg-white p-5 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} className="input sm:max-w-sm" placeholder="Search product, SKU or reference" />
      <select value={direction} onChange={(event) => setDirection(event.target.value)} className="input sm:max-w-[170px]"><option value="all">All directions</option><option value="in">Stock in</option><option value="out">Stock out</option></select>
      <select value={type} onChange={(event) => setType(event.target.value)} className="input sm:max-w-[180px]"><option value="all">All movement types</option><option value="adjustment">Adjustments</option><option value="pos_sale">POS sales</option><option value="reseller_order">Reseller orders</option><option value="system">Other system movements</option></select>
    </div>
    <div className="mt-6 overflow-x-auto border border-navy-800/10 bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="border-b border-navy-800/10 text-xs font-semibold uppercase text-navy-800/50"><th className="px-5 py-4">Date</th><th className="px-5 py-4">Product</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Before</th><th className="px-5 py-4">Change</th><th className="px-5 py-4">After</th><th className="px-5 py-4">Reference / Reason</th><th className="px-5 py-4">By</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-navy-800/45">Loading movements...</td></tr> : movements.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-navy-800/45">No stock movements found</td></tr> : movements.map((movement) => <tr key={movement.id} className="border-b border-navy-800/5 last:border-0"><td className="whitespace-nowrap px-5 py-4 text-navy-800/55">{new Date(movement.createdAt).toLocaleString("en-GB")}</td><td className="px-5 py-4"><p className="font-semibold text-navy-800">{movement.productName}</p><p className="text-xs text-navy-800/45">{movement.sku}{movement.variantId ? " / variation" : ""}</p></td><td className="px-5 py-4"><span className={`badge ${movement.movementType === "adjustment" ? "bg-blue-100 text-blue-700" : "bg-navy-50 text-navy-800"}`}>{movement.movementType}</span></td><td className="px-5 py-4">{movement.before}</td><td className={`px-5 py-4 font-bold ${movement.change > 0 ? "text-emerald-600" : "text-red-600"}`}>{movement.change > 0 ? "+" : ""}{movement.change}</td><td className="px-5 py-4 font-semibold">{movement.after}</td><td className="max-w-xs px-5 py-4"><p className="text-navy-800">{movement.note || "Automatic stock update"}</p>{movement.referenceId && <p className="mt-0.5 text-xs text-navy-800/45">{movement.referenceType}: {movement.referenceId}</p>}</td><td className="px-5 py-4 text-navy-800/55">{movement.createdBy || "System"}</td></tr>)}
    </tbody></table></div>
  </div>;
}
