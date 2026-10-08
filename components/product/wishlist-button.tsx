"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/providers/wishlist-provider";

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggle(productId);
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-soft-white/90 shadow-sm transition-transform hover:scale-105",
        className
      )}
    >
      <Heart
        size={17}
        className={cn(active ? "fill-blush-deep text-blush-deep" : "text-charcoal")}
      />
    </button>
  );
}
