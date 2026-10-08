"use server";

import { createClient } from "@/lib/supabase/server";

export type NewsletterResult =
  | { status: "success" }
  | { status: "duplicate" }
  | { status: "error"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscribes an email to the newsletter. Validates server-side (never
 * trust client-only validation), and relies on the unique constraint on
 * newsletter_subscribers.email to detect duplicates rather than doing a
 * separate read-then-write (avoids a race between the two).
 */
export async function subscribeToNewsletter(email: string): Promise<NewsletterResult> {
  const normalized = email.trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    return { status: "error", message: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: normalized });

  if (error) {
    // Postgres unique_violation
    if (error.code === "23505") {
      return { status: "duplicate" };
    }
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  return { status: "success" };
}
