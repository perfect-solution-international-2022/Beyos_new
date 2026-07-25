const highlights = [
  { title: "Island-wide Delivery", description: "Reliable delivery across Sri Lanka", icon: "globe" },
  { title: "Premium Quality", description: "Carefully selected fabrics for lasting comfort", icon: "quality" },
  { title: "Secure Payments", description: "Safe and protected checkout you can trust", icon: "payment" },
  { title: "Easy Returns", description: "Simple support when something is not right", icon: "returns" },
];

export default function ServiceHighlights() {
  return (
    <section className="mx-3 mt-3 overflow-hidden rounded-2xl border border-navy-800/10 bg-[#f7f7f6] sm:mx-4 lg:mx-6" aria-label="Store services">
      <div className="container-x overflow-x-auto no-scrollbar">
        <div className="flex min-w-max py-5 sm:py-6 lg:grid lg:min-w-0 lg:grid-cols-4">
          {highlights.map((item, index) => (
            <div key={item.title} className={`flex w-[285px] items-center gap-4 px-5 sm:w-[330px] lg:w-auto lg:px-8 ${index > 0 ? "border-l border-navy-800/10" : ""}`}>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#e8e6e2] text-navy-900 sm:h-16 sm:w-16">
                <HighlightIcon name={item.icon} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold uppercase text-navy-900">{item.title}</h2>
                <p className="mt-1 max-w-[190px] text-sm leading-5 text-navy-800/65">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HighlightIcon({ name }: { name: string }) {
  const props = { width: 31, height: 31, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "globe") return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
  if (name === "quality") return <svg {...props}><circle cx="12" cy="10" r="6" /><path d="m9.5 10 1.6 1.6 3.4-3.5M8 15.5 6.5 22l5.5-3 5.5 3-1.5-6.5" /></svg>;
  if (name === "payment") return <svg {...props}><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M3 9h18M15 14h3M17 16v5M15 19h4" /></svg>;
  return <svg {...props}><path d="M7 7h10l3 3-8 5-8-5 3-3ZM4 10v7l8 4 8-4v-7M12 15v6" /><path d="M7 4 4 7l3 3M17 4l3 3-3 3" /></svg>;
}
