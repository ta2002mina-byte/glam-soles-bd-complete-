"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitReviewResult =
  | { status: "success" }
  | { status: "unauthenticated" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

interface SubmitReviewInput {
  productId: string;
  productSlug: string;
  rating: number;
  body: string;
  sizeFeedback: string;
  photoUrls: string[];
}

/**
 * Inserts a review for the current authenticated user.
 *
 * Nothing here is trusted from the client beyond the raw text/rating:
 * - `user_id` always comes from the session, never a client-supplied ID.
 * - RLS ("reviews_owner_insert") re-checks that user_id = auth.uid().
 * - "Verified Purchase" is decided entirely by the
 *   `mark_review_verified_if_eligible` trigger against real delivered
 *   order_items — the client can never set it.
 * - The unique (product_id, user_id) index blocks duplicate reviews.
 */
export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  const rating = Math.round(input.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { status: "error", message: "Please choose a rating between 1 and 5 stars." };
  }

  const body = input.body.trim().slice(0, 2000);
  const sizeFeedback = input.sizeFeedback.trim().slice(0, 100);
  const photoUrls = input.photoUrls.filter(Boolean).slice(0, 6);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "unauthenticated" };

  const { error } = await supabase.from("reviews").insert({
    product_id: input.productId,
    user_id: user.id,
    rating,
    body: body || null,
    size_feedback: sizeFeedback || null,
    photo_urls: photoUrls.length > 0 ? photoUrls : null,
    // is_approved defaults to false in the schema — every review is
    // admin-moderated before it appears publicly.
  });

  if (error) {
    if (error.code === "23505") return { status: "duplicate" };
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  revalidatePath(`/product/${input.productSlug}`);
  return { status: "success" };
}
