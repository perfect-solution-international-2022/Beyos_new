const steps = ["Cart", "Delivery", "Payment", "Complete"];

export default function CheckoutProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Checkout progress" className="mb-8 mt-6">
      <ol className="grid grid-cols-4">
        {steps.map((step, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={step} className="relative flex flex-col items-center text-center">
              {index > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= current ? "bg-brand-600" : "bg-navy-800/12"}`} />}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${complete ? "border-brand-600 bg-brand-600 text-white" : active ? "border-navy-800 bg-navy-800 text-white" : "border-navy-800/15 bg-white text-navy-800/45"}`}>
                {complete ? "✓" : index + 1}
              </span>
              <span className={`mt-2 text-[11px] font-semibold sm:text-sm ${active || complete ? "text-navy-800" : "text-navy-800/40"}`}>{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
