import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminCustomers } from "@/lib/supabase/admin/queries";
import { AdminSearchForm } from "@/components/admin/search-form";
import { Pagination } from "@/components/admin/pagination";
import { RoleBadge } from "@/components/admin/status-badge";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customers — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total } = await getAdminCustomers({ search: params.q, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-charcoal">Customers</h1>
        <p className="text-sm text-charcoal-soft">{total} account{total === 1 ? "" : "s"}</p>
      </div>

      <div className="mb-4">
        <AdminSearchForm defaultValue={params.q} placeholder="Search by name or phone…" />
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-10 text-center text-sm text-charcoal-soft">
          No customers found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-soft-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-cream/50 text-xs uppercase tracking-wide text-charcoal-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Spending</th>
                <th className="px-4 py-3 font-medium">Membership</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((customer) => (
                <tr key={customer.id} className="hover:bg-cream/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${customer.id}`} className="font-medium text-charcoal hover:underline">
                      {customer.fullName || "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{customer.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={customer.role} />
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{customer.orderCount}</td>
                  <td className="px-4 py-3 text-charcoal">{formatBDT(customer.totalSpending)}</td>
                  <td className="px-4 py-3 capitalize text-charcoal-soft">{customer.membershipTier}</td>
                  <td className="px-4 py-3">
                    <span className={customer.accountStatus === "suspended" ? "text-blush-deep" : "text-charcoal-soft"}>
                      {customer.accountStatus === "suspended" ? "Suspended" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/customers" searchParams={{ q: params.q }} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
