const STORAGE_KEY = "glam-soles-bd:wishlist-stock-cache";

/**
 * Remembers whether each wishlisted product was in or out of stock the
 * last time the wishlist page loaded, purely on-device. This lets the
 * "Back in Stock" badge reflect something we actually observed changing —
 * never a fabricated notification — without needing the full
 * notifications/back-in-stock-alert system (Phase 8/10).
 */
function readCache(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage may be unavailable — fail silently
  }
}

/**
 * Compares each product's current stock status against what was cached,
 * returns the set of product IDs that flipped from out-of-stock to
 * in-stock, then updates the cache for next time.
 */
export function detectBackInStock(products: { id: string; inStock?: boolean }[]): Set<string> {
  const cache = readCache();
  const backInStock = new Set<string>();

  for (const product of products) {
    const wasInStock = cache[product.id];
    const isInStock = product.inStock !== false;
    if (wasInStock === false && isInStock) backInStock.add(product.id);
    cache[product.id] = isInStock;
  }

  writeCache(cache);
  return backInStock;
}
