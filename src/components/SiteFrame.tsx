"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import MobileBottomNav from "./MobileBottomNav";

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
    </>
  );
}
