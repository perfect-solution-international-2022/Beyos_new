/**
 * Minimal transactional email sender. No provider is configured yet, so this
 * falls back to logging the message server-side — good enough to develop and
 * test the reset flow end-to-end. Swap in a real provider (Resend/SES/SMTP)
 * by replacing the body of `deliver()`; every call site here stays the same.
 */
async function deliver(to: string, subject: string, html: string, text: string): Promise<void> {
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
