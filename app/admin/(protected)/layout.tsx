import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <AdminShell session={session}>{children}</AdminShell>;
}
