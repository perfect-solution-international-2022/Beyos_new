import { NextResponse } from "next/server";
import { verifyAndApplyOnepayPayment } from "@/lib/onepay-payment";

async function processCallback(transactionId: string) {
  if (!transactionId || transactionId.length > 100) {
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  }
  try {
    const result = await verifyAndApplyOnepayPayment(transactionId);
    return NextResponse.json({ ok: true, paid: result.paid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    const status = message === "OnePay order not found" ? 404 : 400;
    console.error("OnePay callback verification failed");
    return NextResponse.json({ error: "Payment could not be verified" }, { status });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return processCallback(String(body.transaction_id || body.ipg_transaction_id || "").trim());
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return processCallback(String(params.get("transaction_id") || params.get("ipg_transaction_id") || "").trim());
}
