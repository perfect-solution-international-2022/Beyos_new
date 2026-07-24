"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How long does delivery take?",
    a: "Orders are dispatched within 1–2 business days and typically arrive in 2–4 business days island-wide.",
  },
  {
    q: "Can I return or exchange an item?",
    a: "Yes — we offer 7-day easy returns and exchanges on unworn items with tags attached.",
  },
  {
    q: "Do you offer custom printing?",
    a: "Absolutely. We handle custom sizes, styles and prints with low minimum order quantities and no die/plate charges.",
  },
];

export default function SupportPage() {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-navy-800">Support</h1>
      <p className="mt-1 text-sm text-navy-800/50">
        We&apos;re here to help. Reach out and we&apos;ll get back to you shortly.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Contact form */}
        <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="font-bold text-navy-800">Send us a message</h2>
          {sent ? (
            <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
              ✓ Thanks! Your message has been received. Our team will reply to
              your email soon.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="mt-5 space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  Subject
                </label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className="input"
                  placeholder="What do you need help with?"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                  className="input resize-none"
                  placeholder="Describe your issue or question…"
                />
              </div>
              <button type="submit" className="btn-primary">
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* Contact details + FAQ */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-navy-800">Contact</h2>
            <ul className="mt-4 space-y-3 text-sm text-navy-800/70">
              <li className="flex items-center gap-3">
                <ContactIcon name="mail" />
                info@beyosclothing.com
              </li>
              <li className="flex items-center gap-3">
                <ContactIcon name="phone" />
                +94 74 319 1200
              </li>
              <li className="flex items-center gap-3">
                <ContactIcon name="clock" />
                Mon–Sat, 9am – 6pm
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-bold text-navy-800">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y divide-navy-800/10">
          {faqs.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-navy-800">
                {f.q}
                <span className="text-navy-800/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-navy-800/60">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactIcon({ name }: { name: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-brand",
  };
  if (name === "mail")
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </svg>
    );
  if (name === "phone")
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.6 2Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
