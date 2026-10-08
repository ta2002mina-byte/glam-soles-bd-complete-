import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminCustomerById } from "@/lib/supabase/admin/queries";
import { OrderStatusBadge, RoleBadge } from "@/components/admin/status-badge";
import { CustomerRoleControl, CustomerStatusControl } from "@/components/admin/customer-controls";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const { id } = await params;
  const customer = await getAdminCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-charcoal-soft hover:underline">
          ← All customers
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-charcoal">{customer.fullName || "Unnamed customer"}</h1>
          <RoleBadge role={customer.role} />
        </div>
        <p className="text-sm text-charcoal-soft">{customer.phone || "No phone on file"}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft">Orders</p>
          <p className="mt-1 font-display text-xl text-charcoal">{customer.orderCount}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft">Total spending</p>
          <p className="mt-1 font-display text-xl text-charcoal">{formatBDT(customer.totalSpending)}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft">Membership</p>
          <p className="mt-1 font-display text-xl capitalize text-charcoal">{customer.membershipTier}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft">Reward points</p>
          <p className="mt-1 font-display text-xl text-charcoal">{customer.rewardPoints}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <h2 className="mb-3 font-display text-lg text-charcoal">Orders</h2>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-charcoal-soft">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-charcoal-soft">
                    <tr>
                      <th className="pb-2 pr-2 font-medium">Order</th>
                      <th className="pb-2 pr-2 font-medium">Status</th>
                      <th className="pb-2 pr-2 font-medium">Total</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {customer.orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 pr-2">
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-charcoal hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 pr-2">
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td className="py-2 pr-2 text-charcoal">{formatBDT(o.grandTotal)}</td>
                        <td className="py-2 text-charcoal-soft">{new Date(o.createdAt).toLocaleDateString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <h2 className="mb-3 font-display text-lg text-charcoal">Account</h2>
            <p className="mb-3 text-sm text-charcoal-soft">
              Status: <span className={customer.accountStatus === "suspended" ? "text-blush-deep" : "text-charcoal"}>{customer.accountStatus}</span>
            </p>
            <CustomerStatusControl customerId={customer.id} accountStatus={customer.accountStatus} />
          </div>

          {session.role === "admin" && (
            <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
              <h2 className="mb-3 font-display text-lg text-charcoal">Role</h2>
              <CustomerRoleControl customerId={customer.id} role={customer.role} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
