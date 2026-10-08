"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminRole } from "@/lib/supabase/admin-guard";
import type { ReturnStatus } from "@/types/database";
import type { CmsActionResult } from "@/types/admin";

const VALID_STATUSES: ReturnStatus[] = ["requested", "approved", "rejected", "exchanged", "refunded", "completed"];

/**
 * Approve/reject/mark exchanged/refunded/completed, with an optional note.
 * Staff+ only — the same floor as the `returns_staff_update` RLS policy, so
 * even a request that slipped past this guard would still be rejected by
 * Postgres.
 */
export async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
  adminNote: string
): Promise<CmsActionResult> {
  await requireAdminRole("staff");

  if (!VALID_STATUSES.includes(status)) {
    return { status: "error", message: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("returns")
    .update({ status, admin_note: adminNote.trim().slice(0, 1000) || null })
    .eq("id", returnId);

  if (error) return { status: "error", message: "Couldn't update this request. Please try again." };

  revalidatePath("/admin/returns");
  return { status: "ok" };
}
