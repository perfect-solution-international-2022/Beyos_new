import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promotions and Offers",
  description: "Discover current Beyos Clothing discount codes, promotions and special offers.",
  alternates: { canonical: "/promotions" },
  openGraph: {
    title: "Beyos Clothing Promotions",
    description: "Save on your next Beyos Clothing order with current promotions and offers.",
    url: "/promotions",
  },
};

export default function PromotionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
