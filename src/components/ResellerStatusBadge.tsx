export default function ResellerStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let cls = "bg-amber-100 text-amber-700"; // pending / default
  if (["completed", "approved", "delivered", "paid"].includes(s))
    cls = "bg-emerald-100 text-emerald-700";
  else if (["rejected", "cancelled", "failed"].includes(s))
    cls = "bg-red-100 text-red-700";
  else if (["processing", "confirmed", "shipped", "out_for_delivery"].includes(s))
    cls = "bg-blue-100 text-blue-700";
  return <span className={`badge capitalize ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
