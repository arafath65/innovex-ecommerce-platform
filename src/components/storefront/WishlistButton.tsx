"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/useWishlist";

type WishlistButtonProps = {
  storeSlug: string;
  productId: number;
  primaryColor?: string;
  className?: string;
};

export default function WishlistButton({
  storeSlug,
  productId,
  primaryColor = "#e11d48",
  className = "",
}: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist, loaded } = useWishlist(storeSlug);
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      disabled={!loaded}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleWishlist(productId);
      }}
      className={`inline-flex items-center justify-center rounded-full bg-white p-2 shadow-sm transition hover:scale-105 disabled:opacity-50 ${className}`}
    >
      <Heart
        size={19}
        fill={active ? primaryColor : "none"}
        color={active ? primaryColor : "#64748b"}
        strokeWidth={2}
      />
    </button>
  );
}
