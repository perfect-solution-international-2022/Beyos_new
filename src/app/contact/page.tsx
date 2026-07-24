"use client";

import { FormEvent, useState } from "react";

const contactDetails = [
  { icon: "✉", title: "Email Support", value: "support@beyosclothing.com", href: "mailto:support@beyosclothing.com" },
  { icon: "☎", title: "Phone", value: "0743191200", href: "tel:+94743191200" },
  { icon: "●", title: "Location", value: "Kendagaha junction, Elpitiya 80458" },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    event.currentTarget.reset();
  };

  return (
    <main className="min-h-screen bg-[#fafafa] py-12 sm:py-16">
      <div className="container-x">
        <header className="text-center">
          <h1 className="font-display text-3xl font-bold text-navy-800 sm:text-4xl">Get In Touch With Us</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-navy-800/60">
            Have a question, custom design, or bulk order in mind? Send us a message and the Beyos team will get back to you.
          </p>
        </header>

        <div className="mt-12 grid gap-7 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)] sm:p-8">
            <h2 className="text-2xl font-semibold text-navy-800">Send us a Message</h2>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input required name="firstName" className="input" placeholder="First Name" aria-label="First name" />
                <input required name="lastName" className="input" placeholder="Last Name" aria-label="Last name" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required type="email" name="email" className="input" placeholder="Email Address" aria-label="Email address" />
                <input type="tel" name="phone" className="input" placeholder="Phone Number" aria-label="Phone number" />
              </div>
              <textarea required name="message" rows={7} className="input resize-none" placeholder="Write a message here..." aria-label="Message" />
              {sent && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Thank you. Your message has been received.</p>}
              <button type="submit" className="btn-primary px-7 py-3">Send Message</button>
            </form>
          </section>

          <aside className="space-y-5">
            {contactDetails.map((item) => (
              <article key={item.title} className="flex items-start gap-4 rounded-xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#FFE0CC] text-2xl text-brand" aria-hidden="true">{item.icon}</span>
                <div>
                  <h2 className="text-lg font-semibold text-navy-800">{item.title}</h2>
                  {item.href ? (
                    <a href={item.href} className="mt-1 block text-sm text-navy-800/60 transition hover:text-brand">{item.value}</a>
                  ) : (
                    <p className="mt-1 text-sm text-navy-800/60">{item.value}</p>
                  )}
                </div>
              </article>
            ))}

            <div className="overflow-hidden rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              <iframe
                title="Beyos Clothing location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d74285.82508060843!2d80.13999031862414!3d6.278309038350375!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae17f43041be07b%3A0x81a76bcb2ff474c5!2sBeyos%20Clothing!5e0!3m2!1sen!2str!4v1784612089527!5m2!1sen!2str"
                width="100%"
                height="250"
                className="border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
