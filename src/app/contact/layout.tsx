import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Beyos Clothing for product questions, custom clothing designs and bulk orders in Sri Lanka.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Beyos Clothing",
    description: "Get help with products, custom designs and bulk clothing orders.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
