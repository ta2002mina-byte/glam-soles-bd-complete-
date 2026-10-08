"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CheckoutActionResult,
  CheckoutAddress,
  CheckoutItem,
  DeliveryZone,
} from "@/types";

const PHONE_PATTERN = /^(?:\+?8801|01)[3-9]\d{8}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELIVERY_ZONES: DeliveryZone[] = ["inside_dhaka", "outside_dhaka", "express"];

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateAddress(input: CheckoutAddress): string | null {
  if (input.fullName.length < 2 || input.fullName.length > 80) return "Enter your full name.";
  if (!PHONE_PATTERN.test(input.phone.replace(/[\s-]/g, ""))) {
    return "Enter a valid Bangladesh mobile number.";
  }
  if (input.email && (input.email.length > 120 || !EMAIL_PATTERN.test(input.email))) {
    return "Enter a valid email address or leave it blank.";
  }
  if (!input.division || !input.district || !input.area || input.fullAddress.length < 8) {
    return "Complete your delivery address before placing the order.";
  }
  return null;
}

function normalizeItems(items: CheckoutItem[]): CheckoutItem[] {
  const byVariant = new Map<string, number>();
  for (const item of items) {
    const variantId = clean(item?.variantId, 80);
    const quantity = Number.isInteger(item?.quantity) ? Math.min(Math.max(item.quantity, 1), 99) : 0;
    if (variantId && quantity > 0) {
      byVariant.set(variantId, Math.min((byVariant.get(variantId) ?? 0) + quantity, 99));
    }
  }
  return Array.from(byVariant, ([variantId, quantity]) => ({ variantId, quantity }));
}

/**
 * The browser sends only variant IDs and quantities. The database RPC reloads
 * prices, stock, coupon rules and shipping fees before creating anything.
 */
export async function placeCodOrder(input: {
  address: CheckoutAddress;
  deliveryZone: DeliveryZone;
  items: CheckoutItem[];
  couponCode?: string;
  idempotencyKey: string;
}): Promise<CheckoutActionResult> {
  const address: CheckoutAddress = {
    fullName: clean(input.address?.fullName, 80),
    phone: clean(input.address?.phone, 20).replace(/[\s-]/g, ""),
    email: clean(input.address?.email, 120).toLowerCase(),
    division: clean(input.address?.division, 60),
    district: clean(input.address?.district, 60),
    area: clean(input.address?.area, 100),
    fullAddress: clean(input.address?.fullAddress, 500),
    deliveryNote: clean(input.address?.deliveryNote, 300),
  };
  const addressError = validateAddress(address);
  if (addressError) return { status: "error", code: "validation", message: addressError };

  if (!DELIVERY_ZONES.includes(input.deliveryZone)) {
    return { status: "error", code: "validation", message: "Choose a valid delivery option." };
  }

  const items = normalizeItems(input.items ?? []);
  if (items.length === 0) {
    return { status: "error", code: "validation", message: "Your bag is empty." };
  }

  const idempotencyKey = clean(input.idempotencyKey, 100);
  if (idempotencyKey.length < 16) {
    return { status: "error", code: "validation", message: "Your checkout session expired. Please try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("create_cod_order", {
    p_user_id: user?.id ?? null,
    p_items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
    p_address: address,
    p_delivery_zone: input.deliveryZone,
    p_coupon_code: clean(input.couponCode, 50).toUpperCase() || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error || !data || typeof data !== "object") {
    const message = error?.message ?? "";
    if (/coupon/i.test(message)) {
      return { status: "error", code: "unavailable", message: "This coupon is no longer valid. Please remove it and try again." };
    }
    if (/stock|available|variant|coupon|shipping|express/i.test(message)) {
      return {
        status: "error",
        code: "unavailable",
        message: "One or more items changed while you were checking out. Please return to your bag and review it.",
      };
    }
    return {
      status: "error",
      code: "failed",
      message: "Something went wrong. Please try again.",
    };
  }

  const order = data as Record<string, unknown>;
  if (
    typeof order.order_id !== "string" ||
    typeof order.order_number !== "string" ||
    typeof order.confirmation_token !== "string"
  ) {
    return { status: "error", code: "failed", message: "Something went wrong. Please try again." };
  }

  // An authenticated cart is only cleared after the atomic order RPC succeeds.
  if (user) {
    const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
    if (cart) await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  }

  return {
    status: "success",
    orderId: order.order_id,
    orderNumber: order.order_number,
    confirmationToken: order.confirmation_token,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discount_amount),
    deliveryFee: Number(order.delivery_fee),
    grandTotal: Number(order.grand_total),
    estimatedDelivery: String(order.estimated_delivery ?? "3–5 working days"),
  };
}