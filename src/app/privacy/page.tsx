import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Cookie Policy",
  description: "How Beyos Clothing handles personal information and cookies.",
};

export default function PrivacyPage() {
  return (
    <main className="container-x py-14 sm:py-20">
      <article className="mx-auto max-w-3xl text-navy-800">
        <h1 className="font-display text-4xl font-bold">Privacy & Cookie Policy</h1>
        <p className="mt-3 text-sm text-navy-800/55">Last updated: 26 July 2026</p>

        <div className="mt-10 space-y-9 leading-relaxed text-navy-800/75">
          <section>
            <h2 className="text-xl font-bold text-navy-800">Information we process</h2>
            <p className="mt-2">We process the contact, delivery, account and payment-reference information needed to provide your account, fulfil orders, arrange delivery and offer customer support. Card details are handled by the payment provider and are not stored by Beyos Clothing.</p>
          </section>

          <section id="cookies" className="scroll-mt-24">
            <h2 className="text-xl font-bold text-navy-800">Cookies</h2>
            <p className="mt-2">Essential cookies are used for secure sign-in, sessions, cart-related functions and remembering your cookie choice. These are required for the website to operate. Optional analytics or preference cookies are used only after you select Accept.</p>
            <p className="mt-2">Your cookie choice is retained for 180 days. You can change it at any time by deleting the <code className="rounded bg-navy-50 px-1.5 py-0.5 text-sm">beyos_cookie_consent</code> cookie in your browser and refreshing this website.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-800">How information is used</h2>
            <p className="mt-2">Information is used to process purchases, prevent misuse, communicate order updates, provide support and meet legal or accounting requirements. We do not sell personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-800">Service providers</h2>
            <p className="mt-2">Relevant information may be shared with payment, delivery, email and SMS providers only as necessary to complete the requested service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy-800">Contact</h2>
            <p className="mt-2">For privacy questions or requests concerning your information, contact Beyos Clothing through the website contact page.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
