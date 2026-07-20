"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="container-x my-20">
      <div className="relative overflow-hidden rounded-3xl bg-navy-800 px-6 py-14 text-center sm:px-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Join the Beyos Club
          </h2>
          <p className="mt-3 text-white/70">
            Be first to hear about new drops, exclusive offers and styling tips.
            Get 10% off your first order.
          </p>
          {done ? (
            <p className="mt-8 rounded-full bg-brand/20 px-6 py-3 text-sm font-semibold text-brand-100">
              🎉 You&apos;re in! Check your inbox for your welcome offer.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setDone(true);
              }}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand"
              />
              <button type="submit" className="btn-primary shrink-0">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
