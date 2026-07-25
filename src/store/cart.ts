"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/lib/types";
import { WHOLESALE_MIN_QTY } from "@/lib/pricing";

/** The unit price charged for a line, based on the combined cart quantity. */
export function effectiveUnitPrice(
  item: Pick<CartItem, "price" | "wholesalePrice" | "quantity">,
  cartQuantity = item.quantity
): number {
  return item.wholesalePrice != null && item.wholesalePrice > 0 && item.wholesalePrice < item.price && cartQuantity >= WHOLESALE_MIN_QTY
    ? item.wholesalePrice
    : item.price;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  promoCode: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  setPromoCode: (code: string | null) => void;
  totalItems: () => number;
  subtotal: () => number;
}

const sameLine = (a: CartItem, productId: string, size: string, color: string) =>
  a.productId === productId && a.size === size && a.color === color;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      promoCode: null,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) =>
            sameLine(i, item.productId, item.size, item.color)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, item.productId, item.size, item.color)
                  ? { ...i, quantity: i.quantity + item.quantity, wholesalePrice: item.wholesalePrice ?? i.wholesalePrice }
                  : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        }),
      removeItem: (productId, size, color) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, productId, size, color)),
        })),
      updateQuantity: (productId, size, color, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, productId, size, color)
                ? { ...i, quantity: Math.max(1, quantity) }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [], promoCode: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setPromoCode: (code) => set({ promoCode: code }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () => {
        const items = get().items;
        const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        return items.reduce((sum, item) => sum + effectiveUnitPrice(item, cartQuantity) * item.quantity, 0);
      },
    }),
    { name: "beyos-cart" }
  )
);
