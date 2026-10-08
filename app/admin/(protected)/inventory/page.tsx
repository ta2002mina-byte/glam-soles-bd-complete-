import type { Metadata } from "next";
import Link from "next/link";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminInventory } from "@/lib/supabase/admin/queries";
import { AdminSearchForm } from "@/components/admin/search-form";
import { StockStatusBadge } from "@/components/admin/status-badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inventory — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string }>;
}) {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const params = await searchParams;
  const lowOnly = params.low === "1";
  const rows = await getAdminInventory({ search: params.q, lowStockOnly: lowOnly });

  const lowStockCount = rows.filter((r) => r.status === "low_stock").length;
  const outOfStockCount = rows.filter((r) => r.status === "out_of_stock").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-charcoal">Inventory</h1>
          <p className="text-sm text-charcoal-soft">
            {lowStockCount} low stock · {outOfStockCount} out of stock
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/inventory"
            className={cn("rounded-full border border-line px-3.5 py-1.5 text-xs font-medium", !lowOnly ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream")}
          >
            All
          </Link>
          <Link
            href="/admin/inventory?low=1"
            className={cn("rounded-full border border-line px-3.5 py-1.5 text-xs font-medium", lowOnly ? "bg-charcoal text-soft-white" : "text-charcoal-soft hover:bg-cream")}
          >
            Low &amp; out of stock
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <AdminSearchForm defaultValue={params.q} placeholder="Search by SKU or color…" extraParams={{ low: params.low }} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-10 text-center text-sm text-charcoal-soft">
          No variants found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-soft-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-cream/50 text-xs uppercase tracking-wide text-charcoal-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Color / Size</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.variantId} className="hover:bg-cream/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${row.productId}`} className="font-medium text-charcoal hover:underline">
                      {row.productName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">
                    {row.color} / {row.size}
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{row.sku}</td>
                  <td className="px-4 py-3 text-charcoal">{row.stock}</td>
                  <td className="px-4 py-3 text-charcoal-soft">{row.sold}</td>
                  <td className="px-4 py-3">
                    <StockStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
