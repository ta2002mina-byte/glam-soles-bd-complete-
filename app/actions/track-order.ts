"use server";

import { trackOrderPublic } from "@/lib/supabase/queries";
import type { TrackOrderResult } from "@/types";

export async function trackOrder(input: { orderNumber: string; phone?: string; token?: string }): Promise<TrackOrderResult> {
  if (!input.orderNumber || input.orderNumber.trim().length < 5) {
    return { status: "not_found", message: "Enter a valid order number." };
  }
  return trackOrderPublic(input);
}
