"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useStoreCart } from "@/lib/useStoreCart";

type Props = {
  storeSlug: string;
  productId: number;
  name: string;
  slug: string;
  price: string | number;
  image: string;
  currency: string;
  available?: boolean;
  compact?: boolean;
};

export default function AddToCartButton({
  storeSlug,
  productId,
  name,
  slug,
  price,
  image,
  currency,
  available = true,
  compact = false,
}: Props) {
  const { addItem, items } = useStoreCart(storeSlug);

  const alreadyInCart = items.some(
    (item) => item.productId === productId,
  );

  function handleAdd(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!available) return;

    addItem({
      productId,
      name,
      slug,
      price: Number(price),
      image,
      currency,
    });
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={!available}
      aria-label={
        alreadyInCart
          ? `${name} is added to cart`
          : `Add ${name} to cart`
      }
      title={
        !available
          ? "Currently unavailable"
          : alreadyInCart
            ? "Added to cart"
            : "Add to cart"
      }
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full",
        "bg-[#e3182c] text-white shadow-sm transition-transform duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40",
        compact ? "size-10 border-0" : "px-5 py-3 text-sm font-semibold",
      ].join(" ")}
    >
      {alreadyInCart ? <Check size={18} /> : <ShoppingCart size={18} />}
      {!compact && (alreadyInCart ? "Added to cart" : "Add to cart")}
    </button>
  );
}
