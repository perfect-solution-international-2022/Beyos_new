"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import WhatsAppButton from "./WhatsAppButton";

const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

// Storefront chrome (header/footer/cart) — hidden inside the /dashboard portal,
// which supplies its own sidebar + topbar layout.
export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reseller") ||
    pathname.startsWith("/admin");

  if (isPortal) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <CartDrawer />
      <MobileBottomNav />
      <WhatsAppButton />
    </>
  );
}
