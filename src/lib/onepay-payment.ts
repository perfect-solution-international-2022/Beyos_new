import { query } from "@/lib/db";
import { verifyOnepayTransaction } from "@/lib/onepay";

interface PendingPaymentOrder {
  id: number;
  order_ref: string;
  total: string;
  payment_method: string;
  payment_status: string;
  payment_ref: string | null;
}

export async function verifyAndApplyOnepayPayment(transactionId: string, expectedOrderRef?: string) {
  const rows = await query<PendingPaymentOrder>(
    `SELECT id, order_ref, total, payment_method, payment_status, payment_ref
     FROM orders WHERE payment_ref = ? AND deleted_at IS NULL LIMIT 1`,
    [transactionId]
  );
  const order = rows[0];
  if (!order || order.payment_method !== "onepay") throw new Error("OnePay order not found");
  if (expectedOrderRef && order.order_ref !== expectedOrderRef) throw new Error("Order reference mismatch");
  if (order.payment_status === "paid") return { paid: true, orderRef: order.order_ref, alreadyApplied: true };

  const verified = await verifyOnepayTransaction(transactionId);
  const expectedAmount = Math.round(Number(order.total) * 100);
  const verifiedAmount = Math.round(verified.amount * 100);
  if (!Number.isFinite(verified.amount) || verifiedAmount !== expectedAmount) throw new Error("OnePay payment amount mismatch");
  if (verified.currency !== "LKR") throw new Error("OnePay payment currency mismatch");
  if (!verified.paid) return { paid: false, orderRef: order.order_ref, alreadyApplied: false };

  await query(
    `UPDATE orders SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW())
     WHERE id = ? AND payment_ref = ? AND payment_status <> 'paid'`,
    [order.id, verified.transactionId]
  );
  return { paid: true, orderRef: order.order_ref, alreadyApplied: false };
}
