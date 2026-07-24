import type { Metadata } from "next";
import "./globals.css";
import SiteFrame from "@/components/SiteFrame";
import { AuthProvider } from "@/context/AuthProvider";
import { WishlistProvider } from "@/context/WishlistProvider";
import { ToastProvider } from "@/context/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "Beyos Clothing — Style Is Forever",
    template: "%s | Beyos Clothing",
  },
  description:
    "Beyos Clothing — timeless fashion for men and women. Shop premium tees, dresses, hoodies and accessories. Style Is Forever.",
  keywords: ["Beyos", "clothing", "fashion", "men", "women", "accessories"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <SiteFrame>{children}</SiteFrame>
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
