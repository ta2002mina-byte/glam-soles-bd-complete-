"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { getRecentlyViewedIds } from "@/lib/recently-viewed";
import { CollectionSection } from "@/components/home/collection-section";

/** Renders nothing until real data resolves — never a fake/empty skeleton left hanging, and hides entirely if there's nothing to show. */
export function RecentlyViewedRail({ excludeProductId }: { excludeProductId: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    const ids = getRecentlyViewedIds().filter((id) => id !== excludeProductId);
    if (ids.length === 0) {
      const timeout = window.setTimeout(() => setProducts([]), 0);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    fetch(`/api/products/by-ids?ids=${ids.join(",")}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        if (!cancelled) setProducts(data.products ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [excludeProductId]);

  if (!products || products.length === 0) return null;

  return <CollectionSection title="Recently Viewed" products={products} />;
}
