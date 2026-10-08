"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+?8801|01)[3-9]\d{8}$/;

export type AuthActionResult =
  | { status: "success" }
  | { status: "confirmation_required"; message: string }
  | { status: "error"; message: string };

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Creates a new auth.users row. `profiles` is populated automatically by the
 * `handle_new_user` trigger (migration 001) from the metadata passed here —
 * the client never inserts into `profiles` directly.
 */
export async function signUpWithPassword(input: {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const fullName = clean(input.fullName, 80);
  const phone = clean(input.phone, 20).replace(/[\s-]/g, "");
  const email = clean(input.email, 120).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (fullName.length < 2) return { status: "error", message: "Enter your full name." };
  if (!PHONE_PATTERN.test(phone)) return { status: "error", message: "Enter a valid Bangladesh mobile number." };
  if (!EMAIL_PATTERN.test(email)) return { status: "error", message: "Enter a valid email address." };
  if (password.length < 8) return { status: "error", message: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });

  if (error) return { status: "error", message: error.message };
  if (!data.session) {
    return {
      status: "confirmation_required",
      message: "Check your email to confirm your account before signing in.",
    };
  }

  revalidatePath("/account");
  return { status: "success" };
}

export async function signInWithPassword(input: { email: string; password: string }): Promise<AuthActionResult> {
  const email = clean(input.email, 120).toLowerCase();
  const password = typeof input.password === "string" ? input.password : "";

  if (!EMAIL_PATTERN.test(email) || password.length === 0) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { status: "error", message: "Incorrect email or password." };

  revalidatePath("/account");
  return { status: "success" };
}

export async function requestPasswordReset(input: { email: string }): Promise<AuthActionResult> {
  const email = clean(input.email, 120).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { status: "error", message: "Enter a valid email address." };

  const supabase = await createClient();
  // Always return success shape regardless of whether the email exists,
  // so this endpoint can't be used to enumerate registered accounts.
  await supabase.auth.resetPasswordForEmail(email);
  return { status: "confirmation_required", message: "If that email is registered, a reset link is on its way." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/account");
}
