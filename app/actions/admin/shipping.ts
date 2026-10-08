"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/supabase/admin-guard";
import type { CmsActionResult, ShippingSettingsInput } from "@/types/admin";

/**
 * The ONLY place these fees are written. Checkout (Phase 7) and the cart
 * page always read this same row server-side — nothing here is duplicated
 * or hardcoded elsewhere, so this form is the single source of truth for
 * delivery pricing.
 */
export async function updateShippingSettings(input: ShippingSettingsInput): Promise<CmsActionResult> {
  await requireAdminRole("manager");

  if (input.insideDhakaFee < 0 || input.outsideDhakaFee < 0 || input.expressFee < 0) {
    return { status: "error", message: "Fees cannot be negative." };
  }
  if (input.freeShippingThreshold !== null && input.freeShippingThreshold < 0) {
    return { status: "error", message: "Free shipping threshold cannot be negative." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_settings")
    .update({
      inside_dhaka_fee: input.insideDhakaFee,
      outside_dhaka_fee: input.outsideDhakaFee,
      express_fee: input.expressFee,
      express_enabled: input.expressEnabled,
      free_shipping_threshold: input.freeShippingThreshold,
    })
    .eq("id", 1);

  if (error) return { status: "error", message: "Couldn't save shipping settings. Please try again." };

  revalidatePath("/admin/shipping");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { status: "ok" };
}
