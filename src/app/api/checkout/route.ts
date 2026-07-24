import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeOrderTotals, createPendingOrder, CheckoutLine, CustomerInfo } from "@/lib/orders";
import { sendOrderConfirmationSms } from "@/lib/sms";
import { sendOrderEmail } from "@/lib/mail";

interface CheckoutPayload {
  customer: CustomerInfo;
  items: CheckoutLine[];
  promoCode?: string;
}

export async function POST(request: Request) {
  // Require an authenticated user to place an order.
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

  if (!customer?.name || !customer?.email || !customer?.address) {
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

  try {
    const { orderRef } = await createPendingOrder({
      userId: user.id,
      customer,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      total: totals.total,
      paymentMethod: "cod",
      appliedPromotion: totals.appliedPromotion,
    });

    await sendOrderConfirmationSms({
      phone: customer.phone,
      orderRef,
      total: totals.total,
      status: "pending",
    });
    if (customer.email) {
      sendOrderEmail(customer.email, { orderRef, total: totals.total, status: "pending" }).catch((err) =>
        console.error("checkout confirmation email error:", err)
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        orderId: orderRef,
        createdAt: new Date().toISOString(),
        customer,
        items: totals.lineItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        total: totals.total,
        currency: "LKR",
        estimatedDelivery: "2–4 business days",
      },
    });
  } catch (err) {
    console.error("checkout persist error:", err);
    return NextResponse.json(
      { error: "Could not place order. Is the database running?" },
      { status: 500 }
    );
  }
}
