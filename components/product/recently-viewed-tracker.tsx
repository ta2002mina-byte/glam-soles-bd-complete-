"use client";

import { useEffect } from "react";
import { addRecentlyViewed } from "@/lib/recently-viewed";

/** Renders nothing — just records this product as viewed for guests (device-local, no account sync in Phase 5). */
export function RecentlyViewedTracker({ productId }: { productId: string }) {
  useEffect(() => {
    addRecentlyViewed(productId);
  }, [productId]);

  return null;
}
