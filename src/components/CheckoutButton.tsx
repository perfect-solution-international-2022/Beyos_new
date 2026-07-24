"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";

export default function CheckoutButton({
  className = "btn-primary",
  children = "Checkout",
  onNavigate,
}: {
  className?: string;
  children?: React.ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleClick = () => {
    onNavigate?.();
    if (loading) return;
    if (user) {
      router.push("/checkout");
    } else {
      router.push("/login?redirect=/checkout");
    }
  };

  return (
    <button onClick={handleClick} className={className} disabled={loading}>
      {children}
    </button>
  );
}
