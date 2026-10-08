"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { WishlistCard } from "@/components/product/wishlist-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { detectBackInStock } from "@/lib/wishlist-stock-cache";
import type { Product } from "@/types";

export default function WishlistPage() {
  const { ids, toggle } = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [backInStock, setBackInStock] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ids.length === 0) {
      void Promise.resolve().then(() => setProducts([]));
      return;
    }

    let cancelled = false;
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        if (cancelled) return;
        const fetched = data.products ?? [];
        // Preserve the order the shopper actually wishlisted things in.
        const ordered = ids.map((id) => fetched.find((p) => p.id === id)).filter((p): p is Product => Boolean(p));
        setBackInStock(detectBackInStock(ordered));
        setProducts(ordered);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (products === null) {
    return (
      <div className="container-boutique py-12">
        <h1 className="font-display text-2xl text-charcoal md:text-3xl">Wishlist</h1>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container-boutique py-16">
        <EmptyState
          title="Save the styles you love."
          action={
            <Link href="/" className={buttonVariants({ size: "md" })}>
              Continue Shopping
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-boutique py-8 md:py-12">
      <h1 className="font-display text-2xl text-charcoal md:text-3xl">
        Wishlist <span className="text-charcoal-soft/60">({products.length})</span>
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <WishlistCard
            key={product.id}
            product={product}
            isBackInStock={backInStock.has(product.id)}
            onRemove={() => toggle(product.id)}
          />
        ))}
      </div>
    </div>
  );
}
