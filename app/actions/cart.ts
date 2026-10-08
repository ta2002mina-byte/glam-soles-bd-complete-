"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerCartLines, validateCartLines } from "@/lib/supabase/queries";
import type { CartLine, CartLineValidation } from "@/types";

/**
 * Read-only: re-checks price/stock for the given lines against the
 * database. Used by the cart page (guests and signed-in shoppers alike)
 * to surface "price changed" / "only 2 left" / "sold out" warnings before
 * checkout — never trusts the unitPrice/quantity already sitting in the
 * client's cart state.
 */
export async function revalidateCart(items: { variantId: string; quantity: number }[]): Promise<CartLineValidation[]> {
  return validateCartLines(items);
}

export type CartActionResult =
  | { status: "ok"; lines: CartLine[] }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

/**
 * Every mutation below re-reads the variant's real stock from the database
 * before writing — a client can ask to add/set any quantity it likes, but
 * the row we persist is always clamped to what's actually in stock. This
 * mirrors the same "never trust the client" rule the create_order RPC
 * enforces at checkout (see migrations/006).
 */
async function getOrCreateCartId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) return null;
  return created.id;
}

async function currentStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  variantId: string
): Promise<number | null> {
  const { data } = await supabase.from("product_variants").select("stock").eq("id", variantId).maybeSingle();
  return data?.stock ?? null;
}

/** Fetches the signed-in shopper's server-side cart. Returns [] when signed out. */
export async function fetchServerCart(): Promise<CartLine[]> {
  return getServerCartLines();
}

/** Adds a variant to the signed-in shopper's server-side cart (increments if already present). */
export async function addToServerCart(variantId: string, quantity: number): Promise<CartActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const stock = await currentStock(supabase, variantId);
  if (stock === null) return { status: "error", message: "This item is no longer available." };

  const cartId = await getOrCreateCartId(supabase, user.id);
  if (!cartId) return { status: "error", message: "Couldn't update your bag. Please try again." };

  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .maybeSingle();

  const requested = (existingItem?.quantity ?? 0) + Math.max(1, Math.floor(quantity));
  const clamped = Math.max(0, Math.min(requested, stock));

  if (clamped === 0) {
    return { status: "error", message: "This item is currently out of stock." };
  }

  if (existingItem) {
    await supabase.from("cart_items").update({ quantity: clamped }).eq("id", existingItem.id);
  } else {
    await supabase.from("cart_items").insert({ cart_id: cartId, variant_id: variantId, quantity: clamped });
  }

  return { status: "ok", lines: await getServerCartLines() };
}

/** Sets an exact quantity for a line (deletes it when quantity <= 0), clamped to real stock. */
export async function updateServerCartQuantity(variantId: string, quantity: number): Promise<CartActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (!cart) return { status: "ok", lines: [] };

  if (quantity <= 0) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id).eq("variant_id", variantId);
    return { status: "ok", lines: await getServerCartLines() };
  }

  const stock = await currentStock(supabase, variantId);
  if (stock === null) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id).eq("variant_id", variantId);
    return { status: "error", message: "This item is no longer available and was removed from your bag." };
  }

  const clamped = Math.max(1, Math.min(Math.floor(quantity), stock));
  await supabase
    .from("cart_items")
    .update({ quantity: clamped })
    .eq("cart_id", cart.id)
    .eq("variant_id", variantId);

  return { status: "ok", lines: await getServerCartLines() };
}

/** Removes a line entirely. */
export async function removeFromServerCart(variantId: string): Promise<CartActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (cart) {
    await supabase.from("cart_items").delete().eq("cart_id", cart.id).eq("variant_id", variantId);
  }

  return { status: "ok", lines: await getServerCartLines() };
}

/** Clears the signed-in shopper's cart after a confirmed order. */
export async function clearServerCart(): Promise<CartActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (cart) await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  return { status: "ok", lines: [] };
}

/**
 * Called once, right after sign-in: folds the guest's localStorage cart
 * into their account cart (quantities add together, each clamped to real
 * stock), then returns the authoritative merged cart so the UI can drop
 * its local copy entirely.
 */
export async function mergeGuestCartIntoServerCart(
  guestLines: { variantId: string; quantity: number }[]
): Promise<CartActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  if (guestLines.length === 0) {
    return { status: "ok", lines: await getServerCartLines() };
  }

  const cartId = await getOrCreateCartId(supabase, user.id);
  if (!cartId) return { status: "error", message: "Couldn't sync your bag. Please try again." };

  for (const line of guestLines) {
    if (line.quantity <= 0) continue;
    const stock = await currentStock(supabase, line.variantId);
    if (stock === null || stock <= 0) continue;

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("variant_id", line.variantId)
      .maybeSingle();

    const merged = Math.max(0, Math.min((existingItem?.quantity ?? 0) + line.quantity, stock));
    if (merged === 0) continue;

    if (existingItem) {
      await supabase.from("cart_items").update({ quantity: merged }).eq("id", existingItem.id);
    } else {
      await supabase.from("cart_items").insert({ cart_id: cartId, variant_id: line.variantId, quantity: merged });
    }
  }

  return { status: "ok", lines: await getServerCartLines() };
}
