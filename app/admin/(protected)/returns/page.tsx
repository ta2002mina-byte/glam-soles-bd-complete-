import { requireAdminRole } from "@/lib/supabase/admin-guard";
import { getReturnsForAdmin } from "@/lib/supabase/admin-queries";
import { ReturnsTable } from "@/components/admin/returns-table";

export default async function AdminReturnsPage() {
  await requireAdminRole("staff");
  const returns = await getReturnsForAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl text-charcoal">Returns &amp; Exchanges</h1>
      <p className="mt-1 text-sm text-charcoal-soft">{returns.length} request{returns.length === 1 ? "" : "s"} total.</p>
      <div className="mt-6">
        <ReturnsTable initialReturns={returns} />
      </div>
    </div>
  );
}
