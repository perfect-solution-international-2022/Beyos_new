import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transactional email sender. Prefers SMTP (Namecheap Private Email /
 * StackMail — info@beyosclothing.com) since that's the mailbox actually
 * configured for this domain; falls back to Resend if its API key is set
 * instead, and finally throws so callers can no-op gracefully in dev.
 */
let smtpTransporter: Transporter | null = null;
let securitySmtpTransporter: Transporter | null = null;
type MailChannel = "default" | "security";

function getSmtpTransporter(channel: MailChannel): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const security = channel === "security";
  const user = (security ? process.env.SECURITY_SMTP_USER : process.env.SMTP_USER)?.trim();
  const password = (security ? process.env.SECURITY_SMTP_PASSWORD : process.env.SMTP_PASSWORD)?.trim();
  if (!host || !user || !password) return null;
  const existing = security ? securitySmtpTransporter : smtpTransporter;
  if (existing) return existing;

  {
    const port = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user, pass: password },
    });
    if (security) securitySmtpTransporter = transporter;
    else smtpTransporter = transporter;
    return transporter;
  }
}

async function deliver(
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string,
  channel: MailChannel = "default"
): Promise<void> {
  const smtp = getSmtpTransporter(channel);
  if (smtp) {
    await smtp.sendMail({
      from: channel === "security"
        ? process.env.SECURITY_MAIL_FROM || `Beyos Security <${process.env.SECURITY_SMTP_USER}>`
        : process.env.MAIL_FROM || `Beyos Clothing <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Beyos Clothing <no-reply@beyosclothing.com>",
        to,
        subject,
        html,
        reply_to: replyTo,
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to send email via Resend: ${res.status} ${await res.text()}`);
    }
    return;
  }

  // Development fallback — no email provider configured.
  throw new Error("Transactional email is not configured");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export async function sendContactEmail(details: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): Promise<void> {
  const name = escapeHtml(details.name);
  const email = escapeHtml(details.email);
  const phone = escapeHtml(details.phone || "Not provided");
  const message = escapeHtml(details.message).replace(/\n/g, "<br />");

  await deliver(
    "support@beyosclothing.com",
    `Website message from ${details.name}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
       <h2 style="color:#0f2540">New website enquiry</h2>
       <p><strong>Name:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       <div style="margin-top:20px;padding:16px;background:#f7f8fa;border-left:4px solid #f5851f">${message}</div>
     </div>`,
    `New website enquiry\nName: ${details.name}\nEmail: ${details.email}\nPhone: ${details.phone || "Not provided"}\n\n${details.message}`,
    details.email
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await deliver(
    to,
    "Reset your Beyos Clothing password",
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
       <h2 style="color:#0f2540">Reset your password</h2>
       <p>We received a request to reset your Beyos Clothing password. This link expires in 1 hour.</p>
       <p><a href="${resetUrl}" style="display:inline-block;background:#f5851f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600">Reset Password</a></p>
       <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
     </div>`,
    `Reset your password: ${resetUrl} (expires in 1 hour, ignore if you didn't request this)`,
    undefined,
    "security"
  );
}

export async function sendOrderEmail(
  to: string,
  details: { orderRef: string; total: number; status: string }
): Promise<void> {
  const subject = `Beyos order ${details.orderRef}`;
  await deliver(
    to,
    subject,
    `<div style="font-family:sans-serif;max-width:520px;margin:0 auto"><h2 style="color:#0f2540">Order received</h2><p>Your order <strong>${details.orderRef}</strong> is ${details.status}.</p><p style="font-size:20px;font-weight:700;color:#f5851f">LKR ${details.total.toFixed(2)}</p></div>`,
    `Your Beyos order ${details.orderRef} is ${details.status}. Total: LKR ${details.total.toFixed(2)}`
  );
}
