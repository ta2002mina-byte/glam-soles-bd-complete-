const STORAGE_KEY = "glam-soles-bd:recently-viewed";
const MAX_ENTRIES = 12;

/** Guest-only, device-local history. No sensitive data — just product IDs. */
export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewedIds().filter((id) => id !== productId);
    const next = [productId, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage may be unavailable (private mode) — fail silently
  }
}
