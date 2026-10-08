"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import type { AdminActionResult } from "@/types/admin";
import type { DbOrderStatus, DbPaymentStatus } from "@/types/database";

// Forward-moving fulfillment flow, plus the two terminal exceptions.
// Enforced here (server) in addition to the customer-facing RLS
// boundary (migration 005: orders_staff_update) so a staff member can't
// send an order into an invalid state from the admin UI either.
const ORDER_TRANSITIONS: Record<DbOrderStatus, DbOrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export async function updateOrderStatus(orderId: string, nextStatus: DbOrderStatus): Promise<AdminActionResult> {
  const session = await getAdminSession();
  if (!session) return { status: "error", message: "You don't have permission to manage orders." };
  if (!orderId) return { status: "error", message: "Missing order." };

  const supabase = await createClient();
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError || !order) return { status: "error", message: "Order not found." };

  const allowed = ORDER_TRANSITIONS[order.status as DbOrderStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return { status: "error", message: `Cannot move an order from "${order.status}" to "${nextStatus}".` };
  }

  const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
  if (error) return { status: "error", message: "Could not update the order status." };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { status: "success" };
}

/** Set by staff when moving an order to "shipped" — used by the customer-facing /track-order page (migration 013). */
export async function updateOrderCourier(
  orderId: string,
  courierName: string,
  trackingNumber: string
): Promise<AdminActionResult> {
  const session = await getAdminSession();
  if (!session) return { status: "error", message: "You don't have permission to manage orders." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({
      courier_name: courierName.trim().slice(0, 120) || null,
      tracking_number: trackingNumber.trim().slice(0, 120) || null,
    })
    .eq("id", orderId);

  if (error) return { status: "error", message: "Could not save courier details." };

  revalidatePath(`/admin/orders/${orderId}`);
  return { status: "success" };
}

const COD_PAYMENT_TRANSITIONS: Record<DbPaymentStatus, DbPaymentStatus[]> = {
  pending: ["collected", "failed"],
  collected: ["refunded"],
  failed: ["pending", "collected"],
  refunded: [],
};

export async function updatePaymentStatus(
  paymentId: string,
  orderId: string,
  nextStatus: DbPaymentStatus
): Promise<AdminActionResult> {
  const session = await getAdminSession();
  if (!session) return { status: "error", message: "You don't have permission to manage payments." };
  if (nextStatus === "refunded" && !roleAtLeast(session.role, "manager")) {
    // The database trigger (migration 014) enforces this too — this check
    // just gives Staff an immediate, friendly message instead of a raw error.
    return { status: "error", message: "Only a manager or admin can mark a payment refunded." };
  }

  const supabase = await createClient();
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("payment_status")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError || !payment) return { status: "error", message: "Payment record not found." };

  const allowed = COD_PAYMENT_TRANSITIONS[payment.payment_status as DbPaymentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return { status: "error", message: `Cannot move a payment from "${payment.payment_status}" to "${nextStatus}".` };
  }

  if (nextStatus === "collected") {
    // Reuse the existing mark_cod_collected RPC (migration 006): it sets
    // payment_status = 'collected', paid_at = now(), and also advances the
    // order to "delivered" when it was "out_for_delivery" — one atomic,
    // already-audited operation instead of duplicating that logic here.
    const { error } = await supabase.rpc("mark_cod_collected", { p_order_id: orderId });
    if (error) return { status: "error", message: "Could not mark the payment collected." };
  } else {
    const patch: Record<string, unknown> = { payment_status: nextStatus };
    const { error } = await supabase.from("payments").update(patch).eq("id", paymentId);
    if (error) return { status: "error", message: "Could not update the payment status." };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { status: "success" };
}
