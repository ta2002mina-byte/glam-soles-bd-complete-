import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminSessionProfile } from "@/types/admin";
import type { UserRole } from "@/types/database";

const ROLE_RANK: Record<UserRole, number> = {
  customer: 0,
  staff: 1,
  manager: 2,
  admin: 3,
};

/**
 * Server-side gate for every admin route. This is a UX convenience only —
 * the real authority is Postgres RLS (is_staff_or_above / is_manager_or_above
 * in migrations/005), which rejects unauthorized reads/writes regardless of
 * whether this check ran. A customer redirected here still can't read or
 * write privileged rows even if they somehow reached the page.
 */
export async function requireAdminRole(minRole: UserRole): Promise<AdminSessionProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.account_status !== "active" ||
    ROLE_RANK[profile.role as UserRole] < ROLE_RANK[minRole]
  ) {
    redirect(profile ? "/admin" : "/admin/login");
  }

  return { id: profile.id, fullName: profile.full_name, role: profile.role as UserRole };
}
