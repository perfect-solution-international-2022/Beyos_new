import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeOrderTotals, createPendingOrder, cancelOrder, CheckoutLine, CustomerInfo } from "@/lib/orders";
import { createOnepayCheckout } from "@/lib/onepay";
import { query } from "@/lib/db";
import { sendOrderConfirmationSms } from "@/lib/sms";
import { sendOrderEmail } from "@/lib/mail";

interface CheckoutPayload {
  customer: CustomerInfo;
  items: CheckoutLine[];
  promoCode?: string;
}

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to place an order." },
      { status: 401 }
    );
  }

  let payload: CheckoutPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { customer, items, promoCode } = payload;

  if (!customer?.name || !customer?.email || !customer?.address || !customer?.phone) {
    return NextResponse.json(
      { error: "Missing required customer details" },
      { status: 400 }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  let totals;
  try {
    totals = await computeOrderTotals(items, promoCode, user.id);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid item in cart" },
      { status: 400 }
    );
  }

  if (totals.total < 100) {
    return NextResponse.json(
      { error: "Order total must be at least LKR 100 to pay by card." },
      { status: 400 }
    );
  }

  // 1) Create the order as pending/unpaid first.
  let orderId: number;
  let orderRef: string;
  try {
    const created = await createPendingOrder({
      userId: user.id,
      customer,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod: "onepay",
      appliedPromotion: totals.appliedPromotion,
    });
    orderId = created.orderId;
    orderRef = created.orderRef;
  } catch (err) {
    console.error("onepay order create error:", err);
    return NextResponse.json(
      { error: "Could not place order. Is the database running?" },
      { status: 500 }
    );
  }

  // 2) Ask OnePay for a hosted checkout link for this order.
  try {
    const nameParts = customer.name.trim().split(/\s+/);
    const firstName = nameParts[0] || customer.name;
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const origin = new URL(request.url).origin;

    const { redirectUrl, transactionId } = await createOnepayCheckout({
      amount: totals.total,
      currency: "LKR",
      reference: orderRef,
      firstName,
      lastName,
      phone: customer.phone,
      email: customer.email,
      transactionRedirectUrl: `${origin}/checkout/onepay/return?ref=${orderRef}`,
    });

    if (transactionId) {
      await query("UPDATE orders SET payment_ref = ? WHERE id = ?", [transactionId, orderId]);
    }

    await sendOrderConfirmationSms({
      phone: customer.phone,
      orderRef,
      total: totals.total,
      status: "pending payment",
    });
    if (customer.email) {
      sendOrderEmail(customer.email, { orderRef, total: totals.total, status: "pending payment" }).catch((err) =>
        console.error("onepay confirmation email error:", err)
      );
    }

    return NextResponse.json({ success: true, redirectUrl, orderRef });
  } catch (err) {
    console.error("onepay payment request error:", err);
    await cancelOrder(orderId).catch(() => {});
    return NextResponse.json(
      { error: "Could not start card payment right now. Please try Cash on Delivery instead." },
      { status: 502 }
    );
  }
}
