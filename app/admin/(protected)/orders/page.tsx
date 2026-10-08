import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession } from "@/lib/supabase/admin/guard";
import { getAdminOrders } from "@/lib/supabase/admin/queries";
import { AdminSearchForm } from "@/components/admin/search-form";
import { Pagination } from "@/components/admin/pagination";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { formatBDT } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DbOrderStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Orders — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;
const STATUS_FILTERS: { key: DbOrderStatus | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null; // guarded by layout; render nothing while redirecting

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = STATUS_FILTERS.some((f) => f.key === params.status) ? (params.status as DbOrderStatus) : undefined;
  const { items, total } = await getAdminOrders({ search: params.q, status, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-charcoal">Orders</h1>
        <p className="text-sm text-charcoal-soft">{total} order{total === 1 ? "" : "s"}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key || "all"}
            href={f.key ? `/admin/orders?status=${f.key}` : "/admin/orders"}
            className={cn(
              "rounded-full border border-line px-3 py-1 text-xs font-medium",
              (status ?? "") === f.key ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mb-4">
        <AdminSearchForm defaultValue={params.q} placeholder="Search by order number, name, or phone…" extraParams={{ status: params.status }} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-10 text-center text-sm text-charcoal-soft">
          No orders found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-soft-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-cream/50 text-xs uppercase tracking-wide text-charcoal-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((order) => (
                <tr key={order.id} className="hover:bg-cream/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-charcoal hover:underline">
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-charcoal-soft">{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p>
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{order.customerName}</td>
                  <td className="px-4 py-3 text-charcoal-soft">{order.phone}</td>
                  <td className="px-4 py-3 text-charcoal">{formatBDT(order.grandTotal)}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{new Date(order.createdAt).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/orders" searchParams={{ q: params.q, status: params.status }} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
