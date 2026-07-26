"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useCart } from "@/store/cart";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "buyer" | "reseller" | "admin";
  adminRole?: "super" | "manager" | "cashier" | null;
  isWholesaleCustomer: boolean;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: "buyer" | "reseller";
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const setWholesaleCustomer = useCart((state) => state.setWholesaleCustomer);
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setWholesaleCustomer(!!data.user?.isWholesaleCustomer);
      if (midnightTimer.current) clearTimeout(midnightTimer.current);
      if (data.user && Number(data.serverNow) && Number(data.sessionExpiresAt)) {
        // Use the server-provided clock delta, not the visitor's device clock.
        const delay = Math.max(0, (Number(data.sessionExpiresAt) - Number(data.serverNow)) * 1000);
        midnightTimer.current = setTimeout(() => {
          setUser(null);
          setWholesaleCustomer(false);
          const path = window.location.pathname;
          if (["/admin", "/reseller", "/dashboard"].some((prefix) => path.startsWith(prefix))) {
            window.location.assign(`/login?redirect=${encodeURIComponent(`${path}${window.location.search}`)}`);
          }
        }, delay + 250);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setWholesaleCustomer]);

  useEffect(() => {
    refresh();
    return () => {
      if (midnightTimer.current) clearTimeout(midnightTimer.current);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    setWholesaleCustomer(!!data.user?.isWholesaleCustomer);
    return data.user as AuthUser;
  }, [setWholesaleCustomer]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    setWholesaleCustomer(!!data.user?.isWholesaleCustomer);
    return data.user as AuthUser;
  }, [setWholesaleCustomer]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWholesaleCustomer(false);
  }, [setWholesaleCustomer]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
