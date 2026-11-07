"use client";

import { useCallback, useEffect, useState } from "react";

export type StoreCartItem = {
  productId: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  currency: string;
  quantity: number;
};

const eventName = "store-cart-updated";

function storageKey(storeSlug: string) {
  return `innovex-cart-${storeSlug}`;
}

function readCart(storeSlug: string): StoreCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const value = localStorage.getItem(storageKey(storeSlug));
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function writeCart(storeSlug: string, items: StoreCartItem[]) {
  localStorage.setItem(storageKey(storeSlug), JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent(eventName, { detail: { storeSlug } }),
  );
}

export function useStoreCart(storeSlug: string) {
  const [items, setItems] = useState<StoreCartItem[]>([]);

  useEffect(() => {
    if (!storeSlug) return;

    const refresh = () => setItems(readCart(storeSlug));

    refresh();

    window.addEventListener(eventName, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(eventName, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [storeSlug]);

  const addItem = useCallback(
    (item: Omit<StoreCartItem, "quantity">) => {
      const cart = readCart(storeSlug);
      const existing = cart.find((line) => line.productId === item.productId);

      const updated = existing
        ? cart.map((line) =>
            line.productId === item.productId
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...cart, { ...item, quantity: 1 }];

      writeCart(storeSlug, updated);
      setItems(updated);
    },
    [storeSlug],
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number) => {
      const updated = readCart(storeSlug)
        .map((line) =>
          line.productId === productId ? { ...line, quantity } : line,
        )
        .filter((line) => line.quantity > 0);

      writeCart(storeSlug, updated);
      setItems(updated);
    },
    [storeSlug],
  );

  const removeItem = useCallback(
    (productId: number) => {
      const updated = readCart(storeSlug).filter(
        (line) => line.productId !== productId,
      );

      writeCart(storeSlug, updated);
      setItems(updated);
    },
    [storeSlug],
  );

  const clearCart = useCallback(() => {
    writeCart(storeSlug, []);
    setItems([]);
  }, [storeSlug]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return { items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart };
}
