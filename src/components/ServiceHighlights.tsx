const highlights = [
  { title: "Island-wide Delivery", description: "Reliable delivery across Sri Lanka", icon: "globe" },
  { title: "Premium Quality", description: "Carefully selected fabrics for lasting comfort", icon: "quality" },
  { title: "Secure Payments", description: "Safe and protected checkout you can trust", icon: "payment" },
  { title: "Easy Returns", description: "Simple support when something is not right", icon: "returns" },
  { title: "Cash on Delivery", description: "Pay when your order arrives at your doorstep", icon: "cash" },
  { title: "Order Tracking", description: "Follow your delivery from dispatch to arrival", icon: "truck" },
  { title: "Custom Printing", description: "Bring your own T-shirt designs to life", icon: "shirt" },
  { title: "Low Minimum Orders", description: "Order the quantity that works for you", icon: "box" },
  { title: "WhatsApp Support", description: "Friendly help when you need an answer", icon: "chat" },
  { title: "Inclusive Sizes", description: "Comfortable fits for different body types", icon: "ruler" },
];

export default function ServiceHighlights() {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-xl border border-navy-800/10 bg-[#f7f7f6] sm:mx-4 sm:mt-3 sm:rounded-2xl lg:mx-6" aria-label="Store services">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Beyos store services"
        className="service-marquee-viewport overflow-hidden"
      >
        <div className="service-marquee-track">
          {[false, true].map((duplicate) => (
            <div
              key={duplicate ? "duplicate" : "original"}
              className="service-marquee-group"
              aria-hidden={duplicate || undefined}
            >
              {highlights.map((item) => (
                <div
                  key={`${duplicate ? "duplicate" : "original"}-${item.title}`}
                  className="service-marquee-card flex min-h-[68px] shrink-0 items-center gap-1.5 border-r border-navy-800/10 px-2 py-2 text-left sm:min-h-[82px] sm:gap-2.5 sm:px-4 sm:py-2.5 lg:min-h-[92px] lg:gap-3 lg:px-5 lg:py-3"
                >
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8e6e2] text-navy-900 sm:h-10 sm:w-10 lg:h-12 lg:w-12">
                    <HighlightIcon name={item.icon} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-[9px] font-extrabold uppercase leading-3 text-navy-900 min-[380px]:text-[10px] sm:text-xs sm:leading-4 lg:text-[13px] lg:leading-[18px]">{item.title}</h2>
                    <p className="mt-0.5 line-clamp-2 text-[8px] leading-[11px] text-navy-800/65 min-[380px]:text-[9px] sm:text-[10px] sm:leading-[14px] lg:mt-1 lg:text-[11px] lg:leading-4">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightIcon({ name }: { name: string }) {
  const props = { className: "h-[17px] w-[17px] sm:h-5 sm:w-5 lg:h-6 lg:w-6", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "globe") return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
  if (name === "quality") return <svg {...props}><circle cx="12" cy="10" r="6" /><path d="m9.5 10 1.6 1.6 3.4-3.5M8 15.5 6.5 22l5.5-3 5.5 3-1.5-6.5" /></svg>;
  if (name === "payment") return <svg {...props}><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M3 9h18M15 14h3M17 16v5M15 19h4" /></svg>;
  if (name === "returns") return <svg {...props}><path d="M7 7h10l3 3-8 5-8-5 3-3ZM4 10v7l8 4 8-4v-7M12 15v6" /><path d="M7 4 4 7l3 3M17 4l3 3-3 3" /></svg>;
  if (name === "cash") return <svg {...props}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M7 9H5v2M17 15h2v-2" /></svg>;
  if (name === "truck") return <svg {...props}><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
  if (name === "shirt") return <svg {...props}><path d="m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3c-.6 1.3-2 2-4 2s-3.4-.7-4-2Z" /></svg>;
  if (name === "box") return <svg {...props}><path d="m4 7 8-4 8 4-8 4-8-4ZM4 7v10l8 4 8-4V7M12 11v10" /></svg>;
  if (name === "chat") return <svg {...props}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.2A8.3 8.3 0 1 1 21 11.5Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" /></svg>;
  return <svg {...props}><path d="M4 16 16 4l4 4L8 20H4v-4Z" /><path d="m11 9 2 2m1-5 2 2m-8 4 2 2m-5 1 2 2" /></svg>;
}
