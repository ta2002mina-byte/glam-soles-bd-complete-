"use server";

import { getShippingSettings, previewCoupon } from "@/lib/supabase/queries";
import type { CouponPreview, ShippingSettingsPreview } from "@/types";

/** Real, admin-controlled shipping fees for cart-page display. Final zone/fee is confirmed at checkout. */
export async function fetchShippingSettings(): Promise<ShippingSettingsPreview> {
  return getShippingSettings();
}

/**
 * Validates a coupon code against the shopper's real cart contents.
 * Subtotal, stock and category eligibility are all recomputed server-side
 * from the variant IDs/quantities passed in — never from a client-supplied
 * total. This is a preview only; the coupon is actually applied and its
 * usage recorded inside the create_order RPC at checkout (Phase 7).
 */
export async function applyCouponPreview(
  code: string,
  items: { variantId: string; quantity: number }[]
): Promise<CouponPreview> {
  return previewCoupon(code, items);
}
