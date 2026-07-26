"use client";

const highlights = [
  { title: "Island-wide delivery", description: "Fast, tracked delivery across Sri Lanka", icon: "truck" },
  { title: "Cash on delivery", description: "Pay safely when your order arrives", icon: "cash" },
  { title: "Secure checkout", description: "Protected OnePay card payments", icon: "lock" },
  { title: "Friendly support", description: "Real help before and after your order", icon: "chat" },
];

export default function ServiceHighlights() {
  return (
    <section className="container-x relative z-10 -mt-5" aria-label="Why shop with Beyos">
      <div className="premium-panel glass-edge overflow-hidden rounded-2xl bg-white/55">
        <div className="service-highlight-track flex w-max">
          <HighlightGroup />
          <HighlightGroup duplicate />
        </div>
      </div>
      <style jsx>{`
        .service-highlight-track { animation: serviceHighlightScroll 12s linear infinite; }
        @keyframes serviceHighlightScroll { to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .service-highlight-track { animation: none; } }
      `}</style>
    </section>
  );
}

function HighlightGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="flex" aria-hidden={duplicate || undefined}>
      {highlights.map((item) => (
        <div key={item.title} className="group relative flex w-[85vw] max-w-[430px] shrink-0 items-center gap-3 border-r border-white/75 bg-gradient-to-br from-white/70 to-navy-50/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.95)] sm:w-[360px] sm:p-5 lg:w-[430px]">
          <span className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-brand-50/80 text-brand-600 shadow-[inset_0_1px_0_white,0_8px_18px_rgba(140,66,24,.12)] transition group-hover:-translate-y-0.5 group-hover:bg-brand-600 group-hover:text-white"><Icon name={item.icon} /></span>
          <span className="relative z-20"><strong className="block text-sm text-navy-800">{item.title}</strong><small className="mt-0.5 block text-xs leading-4 text-navy-800/50">{item.description}</small></span>
        </div>
      ))}
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const p = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "truck") return <svg {...p}><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>;
  if (name === "cash") return <svg {...p}><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9H5v2M17 15h2v-2"/></svg>;
  if (name === "lock") return <svg {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
  return <svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.7-4.2A8.3 8.3 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
}
