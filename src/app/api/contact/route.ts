import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/mail";
import { consumeRateLimit, requestIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`contact:${requestIp(request)}`, 5, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    message?: string;
    website?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true });

  const firstName = body.firstName?.trim() || "";
  const lastName = body.lastName?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const phone = body.phone?.trim() || "";
  const message = body.message?.trim() || "";

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 30 || message.length > 5000) {
    return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  try {
    await sendContactEmail({ name: `${firstName} ${lastName}`, email, phone, message });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("contact email error:", error);
    return NextResponse.json(
      { error: "We could not send your message. Please email support@beyosclothing.com directly." },
      { status: 503 }
    );
  }
}
