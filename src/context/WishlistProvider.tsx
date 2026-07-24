"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthProvider";

interface WishlistContextValue {
  slugs: string[];
  count: number;
  loading: boolean;
  has: (slug: string) => boolean;
  /** Adds/removes in the DB. Returns false if the user is not signed in. */
  toggle: (slug: string) => Promise<boolean>;
  remove: (slug: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the user's wishlist whenever auth state changes.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setSlugs([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/wishlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSlugs(d.slugs ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlugs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    async (slug: string) => {
      if (!user) return false;
      const isIn = slugs.includes(slug);
      const method = isIn ? "DELETE" : "POST";
      // Optimistic update
      setSlugs((prev) =>
        isIn ? prev.filter((s) => s !== slug) : [slug, ...prev]
      );
      try {
        const res = await fetch("/api/wishlist", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const d = await res.json();
        if (res.ok && Array.isArray(d.slugs)) setSlugs(d.slugs);
      } catch {
        // Revert on failure
        setSlugs((prev) =>
          isIn ? [slug, ...prev] : prev.filter((s) => s !== slug)
        );
      }
      return true;
    },
    [user, slugs]
  );

  const remove = useCallback(
    async (slug: string) => {
      setSlugs((prev) => prev.filter((s) => s !== slug));
      try {
        const res = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const d = await res.json();
        if (res.ok && Array.isArray(d.slugs)) setSlugs(d.slugs);
      } catch {
        /* ignore */
      }
    },
    []
  );

  return (
    <WishlistContext.Provider
      value={{ slugs, count: slugs.length, loading, has, toggle, remove }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
