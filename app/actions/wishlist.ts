"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerWishlistProductIds } from "@/lib/supabase/queries";

export type WishlistActionResult =
  | { status: "ok"; productIds: string[] }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

async function getOrCreateWishlistId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase.from("wishlists").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("wishlists")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) return null;
  return created.id;
}

async function currentWishlistProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wishlistId: string
): Promise<string[]> {
  const { data } = await supabase.from("wishlist_items").select("product_id").eq("wishlist_id", wishlistId);
  return (data ?? []).map((r) => r.product_id);
}

/** Fetches the signed-in shopper's server-side wishlist product IDs. Returns [] when signed out. */
export async function fetchServerWishlist(): Promise<string[]> {
  return getServerWishlistProductIds();
}

/** Adds or removes a product from the signed-in shopper's server-side wishlist. */
export async function toggleServerWishlist(productId: string): Promise<WishlistActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const wishlistId = await getOrCreateWishlistId(supabase, user.id);
  if (!wishlistId) return { status: "error", message: "Couldn't update your wishlist. Please try again." };

  const { data: existing } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("wishlist_id", wishlistId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist_items").delete().eq("id", existing.id);
  } else {
    await supabase.from("wishlist_items").insert({ wishlist_id: wishlistId, product_id: productId });
  }

  return { status: "ok", productIds: await currentWishlistProductIds(supabase, wishlistId) };
}

/**
 * Called once, right after sign-in: folds the guest's localStorage wishlist
 * into their account wishlist (duplicates ignored via the unique
 * (wishlist_id, product_id) constraint), then returns the merged list.
 */
export async function mergeGuestWishlistIntoServer(productIds: string[]): Promise<WishlistActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" };

  const wishlistId = await getOrCreateWishlistId(supabase, user.id);
  if (!wishlistId) return { status: "error", message: "Couldn't sync your wishlist. Please try again." };

  if (productIds.length > 0) {
    const rows = productIds.map((productId) => ({ wishlist_id: wishlistId, product_id: productId }));
    await supabase.from("wishlist_items").upsert(rows, { onConflict: "wishlist_id,product_id", ignoreDuplicates: true });
  }

  return { status: "ok", productIds: await currentWishlistProductIds(supabase, wishlistId) };
}
