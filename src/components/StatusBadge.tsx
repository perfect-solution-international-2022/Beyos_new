export default function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === "completed" || s === "delivered"
      ? "bg-emerald-100 text-emerald-700"
      : s === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";
  return <span className={`badge capitalize ${cls}`}>{status}</span>;
}
