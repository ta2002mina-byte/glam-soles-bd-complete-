"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountActionResult, AddressInput } from "@/types";

const PHONE_PATTERN = /^(?:\+?8801|01)[3-9]\d{8}$/;
const RETURN_REASONS = ["wrong_size", "wrong_product", "damaged", "defective", "other"] as const;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/** Updates the signed-in customer's own name/phone. Never touches role, membership_tier or reward_points — RLS also blocks that. */
export async function updateProfile(input: { fullName: string; phone: string }): Promise<AccountActionResult> {
  const fullName = clean(input.fullName, 80);
  const phone = clean(input.phone, 20).replace(/[\s-]/g, "");
  if (fullName.length < 2) return { status: "error", message: "Enter your full name." };
  if (!PHONE_PATTERN.test(phone)) return { status: "error", message: "Enter a valid Bangladesh mobile number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account");
  return { status: "success" };
}

function validateAddress(input: AddressInput): string | null {
  if (!["home", "office", "other"].includes(input.label)) return "Choose a valid address label.";
  if (clean(input.fullName, 80).length < 2) return "Enter a full name for this address.";
  if (!PHONE_PATTERN.test(clean(input.phone, 20).replace(/[\s-]/g, ""))) return "Enter a valid Bangladesh mobile number.";
  if (!input.division.trim() || !input.district.trim() || !input.area.trim()) return "Fill in division, district and area.";
  if (input.fullAddress.trim().length < 8) return "Enter your full street address.";
  return null;
}

/** Inserts a new address for the signed-in customer. If marked default, unsets any other default first (RLS keeps this scoped to their own rows). */
export async function addAddress(input: AddressInput): Promise<AccountActionResult> {
  const validationError = validateAddress(input);
  if (validationError) return { status: "error", message: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  if (input.isDefault) {
    await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("shipping_addresses").insert({
    user_id: user.id,
    label: input.label,
    full_name: clean(input.fullName, 80),
    phone: clean(input.phone, 20).replace(/[\s-]/g, ""),
    division: clean(input.division, 60),
    district: clean(input.district, 60),
    area: clean(input.area, 60),
    full_address: clean(input.fullAddress, 300),
    delivery_note: input.deliveryNote ? clean(input.deliveryNote, 200) : null,
    is_default: input.isDefault,
  });
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/addresses");
  return { status: "success" };
}

export async function updateAddress(id: string, input: AddressInput): Promise<AccountActionResult> {
  const validationError = validateAddress(input);
  if (validationError) return { status: "error", message: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  if (input.isDefault) {
    await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id).neq("id", id);
  }

  const { error } = await supabase
    .from("shipping_addresses")
    .update({
      label: input.label,
      full_name: clean(input.fullName, 80),
      phone: clean(input.phone, 20).replace(/[\s-]/g, ""),
      division: clean(input.division, 60),
      district: clean(input.district, 60),
      area: clean(input.area, 60),
      full_address: clean(input.fullAddress, 300),
      delivery_note: input.deliveryNote ? clean(input.deliveryNote, 200) : null,
      is_default: input.isDefault,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/addresses");
  return { status: "success" };
}

export async function deleteAddress(id: string): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  const { error } = await supabase.from("shipping_addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/addresses");
  return { status: "success" };
}

export async function setDefaultAddress(id: string): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  await supabase.from("shipping_addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("shipping_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/addresses");
  return { status: "success" };
}

/**
 * Requests a return/exchange for a delivered order item. `order_item_id`,
 * `order_id` and eligibility (delivered + belongs to this user) are
 * re-verified server-side against real order data — never trusted from
 * the client beyond the IDs it submits.
 */
export async function requestReturn(input: {
  orderItemId: string;
  reason: (typeof RETURN_REASONS)[number];
  description: string;
  photoPath?: string;
}): Promise<AccountActionResult> {
  if (!RETURN_REASONS.includes(input.reason)) return { status: "error", message: "Choose a valid reason." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, order_id, orders!inner(user_id, status)")
    .eq("id", input.orderItemId)
    .maybeSingle<{ id: string; order_id: string; orders: { user_id: string | null; status: string } }>();

  if (itemError || !item || item.orders.user_id !== user.id || item.orders.status !== "delivered") {
    return { status: "error", message: "This item isn't eligible for a return or exchange." };
  }

  const { error } = await supabase.from("returns").insert({
    order_id: item.order_id,
    order_item_id: item.id,
    user_id: user.id,
    reason: input.reason,
    description: clean(input.description, 1000) || null,
    photo_url: input.photoPath || null,
  });
  if (error) {
    if (error.code === "23505") return { status: "error", message: "A return has already been requested for this item." };
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath("/account/returns");
  return { status: "success" };
}

export async function markNotificationRead(id: string): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/notifications");
  return { status: "success" };
}

export async function markAllNotificationsRead(): Promise<AccountActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) return { status: "error", message: "Something went wrong. Please try again." };

  revalidatePath("/account/notifications");
  return { status: "success" };
}
