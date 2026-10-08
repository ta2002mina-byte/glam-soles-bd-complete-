"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import type { AdminActionResult } from "@/types/admin";
import type { UserRole } from "@/types/database";

export async function updateCustomerStatus(
  customerId: string,
  accountStatus: "active" | "suspended"
): Promise<AdminActionResult> {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) {
    return { status: "error", message: "You don't have permission to manage customer accounts." };
  }
  if (!["active", "suspended"].includes(accountStatus)) {
    return { status: "error", message: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ account_status: accountStatus }).eq("id", customerId);
  if (error) return { status: "error", message: "Could not update the account." };

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return { status: "success" };
}

const ASSIGNABLE_ROLES: UserRole[] = ["customer", "staff", "manager", "admin"];

/**
 * Admin-only. Also enforced independently by the trg_profiles_role_guard
 * database trigger (migration 013) — a Manager calling this action, or
 * calling Supabase directly, still cannot elevate a role.
 */
export async function updateCustomerRole(customerId: string, role: UserRole): Promise<AdminActionResult> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") {
    return { status: "error", message: "Only an admin can change a user's role." };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { status: "error", message: "Invalid role." };
  }
  if (customerId === session.userId) {
    return { status: "error", message: "You can't change your own role." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", customerId);
  if (error) return { status: "error", message: "Could not update the role." };

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return { status: "success" };
}
