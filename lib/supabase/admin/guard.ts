import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import type { AdminSession } from "@/types/admin";

const STAFF_ROLES: UserRole[] = ["staff", "manager", "admin"];

/**
 * Resolves the current logged-in admin/manager/staff session, if any.
 * Returns null for signed-out visitors AND for signed-in customers —
 * both cases the caller should treat identically (no admin access).
 *
 * This is the server-side authority for admin access. RLS (migration 005)
 * enforces the same boundary at the database layer independently, so
 * even a bug here cannot expose privileged data — this check only
 * controls whether the admin UI renders.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !STAFF_ROLES.includes(profile.role) || profile.account_status !== "active") {
    return null;
  }

  return {
    userId: user.id,
    fullName: profile.full_name,
    email: user.email ?? null,
    role: profile.role,
  };
}

/** Role hierarchy used to gate individual admin pages/actions. */
export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  const order: UserRole[] = ["customer", "staff", "manager", "admin"];
  return order.indexOf(role) >= order.indexOf(minimum);
}
