export type PosPaymentStatus = "unpaid" | "advance" | "paid";

export function resolvePosPayment(total: number, requestedStatus: unknown, requestedPaidAmount: unknown) {
  let status: PosPaymentStatus = requestedStatus === "unpaid" || requestedStatus === "advance" || requestedStatus === "paid"
    ? requestedStatus
    : "paid";
  const roundedTotal = Math.round(total * 100) / 100;
  const amountWasProvided = requestedPaidAmount !== undefined && requestedPaidAmount !== null && requestedPaidAmount !== "";
  let paidAmount = amountWasProvided
    ? Number(requestedPaidAmount)
    : status === "paid" ? roundedTotal : status === "unpaid" ? 0 : Number(requestedPaidAmount);
  paidAmount = Math.round(paidAmount * 100) / 100;

  if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > roundedTotal) {
    throw new Error("Paid amount must be between zero and the order total");
  }
  if (amountWasProvided) status = paidAmount <= 0 ? "unpaid" : paidAmount >= roundedTotal ? "paid" : "advance";
  if (status === "advance" && (paidAmount <= 0 || paidAmount >= roundedTotal)) {
    throw new Error("Advance payment must be greater than zero and less than the order total");
  }

  return { status, paidAmount, balanceDue: Math.round((roundedTotal - paidAmount) * 100) / 100 };
}
