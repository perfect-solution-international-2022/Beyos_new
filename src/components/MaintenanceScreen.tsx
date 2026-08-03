import Image from "next/image";

export default function MaintenanceScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f6f2] px-6 py-12 text-[#0d263d]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[#ff891e]" />
      <div className="absolute -left-32 top-1/4 h-80 w-80 animate-pulse rounded-full bg-[#ff891e]/10 blur-3xl" />
      <div className="absolute -right-28 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-[#0d263d]/10 blur-3xl [animation-delay:700ms]" />
      <div className="absolute left-[8%] top-[14%] h-3 w-3 rotate-45 bg-[#ff891e]/30" />
      <div className="absolute bottom-[16%] right-[10%] h-5 w-5 rounded-full border-2 border-[#0d263d]/15" />

      <div className="relative w-full max-w-2xl text-center">
        <div className="mx-auto w-44 sm:w-52">
          <Image src="/images/logo.png" alt="Beyos Clothing" width={900} height={900} priority className="h-auto w-full drop-shadow-sm" />
        </div>

        <div className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ff891e]/25 bg-white shadow-xl shadow-[#0d263d]/5">
          <svg className="h-8 w-8 animate-[spin_8s_linear_infinite] text-[#ff891e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 13.65-4.3M19.5 12a7.5 7.5 0 0 1-13.65 4.3M18 4.5v3.75h-3.75M6 19.5v-3.75h3.75" />
          </svg>
        </div>
        <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.35em] text-[#ff891e]">We&rsquo;ll be back soon</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#0d263d] sm:text-6xl">Something fresh is on the way.</h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[#0d263d]/65">
          Beyos Clothing is getting a quick upgrade. Thanks for your patience while we make your shopping experience even better.
        </p>
        <div className="mt-9 inline-flex items-center justify-center gap-2 rounded-full border border-[#0d263d]/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-[#0d263d]/60 shadow-sm backdrop-blur">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff891e] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff891e]" />
          </span>
          Our team is working on it
        </div>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.28em] text-[#0d263d]/35">Style is forever</p>
      </div>
    </main>
  );
}
