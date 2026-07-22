import Link from "next/link";
import ResellerDetailView from "@/components/ResellerDetailView";

export default async function AdminResellerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <Link href="/admin/resellers" className="text-sm font-semibold text-navy-800/60 hover:text-brand">
        &larr; Back to Resellers
      </Link>
      <ResellerDetailView resellerId={id} />
    </div>
  );
}
