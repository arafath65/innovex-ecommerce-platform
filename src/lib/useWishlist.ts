"use client";

import { useCallback, useEffect, useState } from "react";

export function useWishlist(storeSlug: string) {
  const storageKey = `wishlist-${storeSlug}`;

  const [productIds, setProductIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  const readWishlist = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];

      setProductIds(
        Array.isArray(parsed)
          ? parsed.filter((id) => typeof id === "number")
          : [],
      );
    } catch {
      setProductIds([]);
    }

    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    readWishlist();

    const handleUpdate = () => readWishlist();

    window.addEventListener("wishlist-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("wishlist-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [readWishlist]);

  const toggleWishlist = useCallback(
    (productId: number) => {
      const saved = localStorage.getItem(storageKey);
      const current: number[] = saved ? JSON.parse(saved) : [];

      const updated = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];

      localStorage.setItem(storageKey, JSON.stringify(updated));
      setProductIds(updated);

      window.dispatchEvent(new Event("wishlist-updated"));
    },
    [storageKey],
  );

  const isWishlisted = useCallback(
    (productId: number) => productIds.includes(productId),
    [productIds],
  );

  return {
    productIds,
    count: productIds.length,
    loaded,
    toggleWishlist,
    isWishlisted,
  };
}
