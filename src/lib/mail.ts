import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transactional email sender. Prefers SMTP (Namecheap Private Email /
 * StackMail — info@beyosclothing.com) since that's the mailbox actually
 * configured for this domain; falls back to Resend if its API key is set
 * instead, and finally throws so callers can no-op gracefully in dev.
 */
let smtpTransporter: Transporter | null = null;
function getSmtpTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  if (!host || !user || !password) return null;
  if (!smtpTransporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user, pass: password },
    });
  }
  return smtpTransporter;
}

async function deliver(to: string, subject: string, html: string, text: string): Promise<void> {
  const smtp = getSmtpTransporter();
  if (smtp) {
    await smtp.sendMail({
      from: process.env.MAIL_FROM || `Beyos Clothing <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
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
    `Reset your password: ${resetUrl} (expires in 1 hour, ignore if you didn't request this)`
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
