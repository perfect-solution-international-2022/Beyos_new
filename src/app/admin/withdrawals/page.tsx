import { redirect } from "next/navigation";

export default function AdminWithdrawalsIndex() {
  redirect("/admin/withdrawals/pending");
}
