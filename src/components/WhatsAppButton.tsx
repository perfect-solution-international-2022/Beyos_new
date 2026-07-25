"use client";

import { usePathname } from "next/navigation";

const WHATSAPP_URL =
  "https://wa.me/94743191200?text=Hello%20Beyos%20Clothing%2C%20I%20would%20like%20some%20help.";

export default function WhatsAppButton() {
  const pathname = usePathname();
  const isProduct = pathname.startsWith("/product/");
  const isPortal =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reseller") ||
    pathname.startsWith("/admin");

  if (isPortal) return null;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Beyos Clothing on WhatsApp"
      title="Chat on WhatsApp"
      className={`fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_8px_28px_rgba(15,37,64,0.25)] ring-4 ring-white transition hover:scale-105 hover:bg-[#1fbd5a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-navy-800/30 sm:right-6 lg:bottom-6 ${isProduct ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="currentColor"
      >
        <path d="M16.04 3A12.9 12.9 0 0 0 5.1 22.72L3.4 29l6.43-1.69A12.96 12.96 0 1 0 16.04 3Zm0 23.72c-1.9 0-3.77-.5-5.4-1.45l-.39-.23-3.82 1 1.02-3.72-.25-.4a10.68 10.68 0 1 1 8.84 4.8Zm5.86-8.01c-.32-.16-1.9-.94-2.2-1.05-.29-.11-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.27-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59a9.62 9.62 0 0 1-1.78-2.21c-.19-.32-.02-.49.14-.65.15-.14.32-.37.48-.56.16-.18.21-.32.32-.53.11-.21.06-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.67s1.15 3.09 1.31 3.3c.16.21 2.26 3.45 5.47 4.84.76.33 1.36.53 1.83.68.77.24 1.46.21 2.01.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.29-.22-.61-.38Z" />
      </svg>
    </a>
  );
}
