import type { Metadata } from "next";
import "./globals.css";
import SiteFrame from "@/components/SiteFrame";
import { AuthProvider } from "@/context/AuthProvider";
import { WishlistProvider } from "@/context/WishlistProvider";
import { ToastProvider } from "@/context/ToastProvider";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "Beyos Clothing - Style Is Forever",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Shop premium clothing, oversized T-shirts and custom apparel from Beyos Clothing with island-wide delivery across Sri Lanka.",
  keywords: ["Beyos Clothing", "Sri Lanka clothing", "oversized T-shirts", "custom clothing", "online clothing store"],
  applicationName: SITE_NAME,
  category: "shopping",
  manifest: "/manifest.webmanifest",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_LK",
    url: "/",
    siteName: SITE_NAME,
    title: "Beyos Clothing - Style Is Forever",
    description: "Premium clothing and custom apparel with island-wide delivery across Sri Lanka.",
    images: [{ url: "/images/hero-images/hero1.webp", width: 1200, height: 900, alt: "Beyos Clothing collection" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyos Clothing - Style Is Forever",
    description: "Premium clothing and custom apparel with island-wide delivery across Sri Lanka.",
    images: ["/images/hero-images/hero1.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL.toString(),
              logo: new URL("/images/logo.png", SITE_URL).toString(),
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+94-74-319-1200",
                contactType: "customer service",
                areaServed: "LK",
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
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
