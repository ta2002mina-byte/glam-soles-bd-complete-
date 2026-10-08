"use server";

import { createClient } from "@/lib/supabase/server";
import type { AdminActionResult } from "@/types/admin";

const STAFF_ROLES = ["staff", "manager", "admin"];

export async function adminSignIn(input: { email: string; password: string }): Promise<AdminActionResult> {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase().slice(0, 200) : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { status: "error", message: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !STAFF_ROLES.includes(profile.role) || profile.account_status !== "active") {
    // Not a staff account (or suspended) — do not leave a privileged-looking
    // session hanging around; sign back out immediately.
    await supabase.auth.signOut();
    return { status: "error", message: "This account does not have admin access." };
  }

  return { status: "success" };
}

export async function adminSignOut(): Promise<AdminActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { status: "success" };
}
