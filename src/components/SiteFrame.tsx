"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomNav from "./MobileBottomNav";
import WhatsAppButton from "./WhatsAppButton";
import CookieConsent from "./CookieConsent";
import MaintenanceScreen from "./MaintenanceScreen";
import { useAuth } from "@/context/AuthProvider";

const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

// Storefront chrome (header/footer/cart) — hidden inside the /dashboard portal,
// which supplies its own sidebar + topbar layout.
export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState<boolean | null>(null);
  const isPortal =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reseller") ||
    pathname.startsWith("/admin");

  const routeBypassesMaintenance =
    isPortal ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");
  const isAdminPreview = user?.role === "admin";
  const canBypassMaintenance = routeBypassesMaintenance || isAdminPreview;

  useEffect(() => {
    if (routeBypassesMaintenance) return;
    let active = true;
    fetch("/api/site-status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (active) setMaintenance(data.maintenance === true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [routeBypassesMaintenance, pathname]);

  if (isPortal) return <>{children}</>;
  // A logged-out/authenticated-user check is only needed when maintenance is
  // actually enabled (to allow the admin preview). Do not hold up every normal
  // storefront visit waiting for the auth request.
  if ((maintenance === null || (maintenance && authLoading)) && !routeBypassesMaintenance) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f6f2]" aria-label="Loading website status">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#0d263d]/15 border-t-[#ff891e]" />
      </main>
    );
  }
  if (maintenance && !canBypassMaintenance) return <MaintenanceScreen />;

  return (
    <>
      {maintenance && isAdminPreview && (
        <div className="fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-[#ff891e]/30 bg-[#0d263d] px-4 py-2 text-xs font-semibold text-white shadow-xl">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff891e]" />
          Admin preview · Maintenance mode is on
        </div>
      )}
      <Header />
      <main className="storefront flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <CartDrawer />
      <MobileBottomNav />
      <WhatsAppButton />
      <CookieConsent />
    </>
  );
}
