import Link from "next/link";
import OrderDetailView from "@/components/OrderDetailView";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return (
    <div>
      <Link href="/admin/orders" className="text-sm font-semibold text-navy-800/60 hover:text-brand">
        &larr; Back to Orders
      </Link>
      <OrderDetailView orderRef={ref} />
    </div>
  );
}
