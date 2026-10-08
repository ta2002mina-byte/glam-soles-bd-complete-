import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { getAdminProducts } from "@/lib/supabase/admin/queries";
import { Pagination } from "@/components/admin/pagination";
import { AdminSearchForm } from "@/components/admin/search-form";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Products — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session || !roleAtLeast(session.role, "manager")) return <AccessRestricted requiredRole="manager" />;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items, total } = await getAdminProducts({ search: params.q, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-charcoal">Products</h1>
          <p className="text-sm text-charcoal-soft">{total} product{total === 1 ? "" : "s"}</p>
        </div>
        <Link href="/admin/products/new">
          <Button>
            <Plus size={16} aria-hidden="true" />
            Add product
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <AdminSearchForm defaultValue={params.q} placeholder="Search by name or SKU…" />
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-10 text-center text-sm text-charcoal-soft">
          No products found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-soft-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-cream/50 text-xs uppercase tracking-wide text-charcoal-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((product) => (
                <tr key={product.id} className="hover:bg-cream/30">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                        {product.primaryImage && (
                          <Image src={product.primaryImage} alt="" fill sizes="48px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-charcoal">{product.name}</p>
                        <p className="text-xs text-charcoal-soft">{product.sku}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">{product.categoryName}</td>
                  <td className="px-4 py-3">
                    <p className="text-charcoal">{formatBDT(product.salePrice ?? product.regularPrice)}</p>
                    {product.salePrice && <p className="text-xs text-charcoal-soft line-through">{formatBDT(product.regularPrice)}</p>}
                  </td>
                  <td className="px-4 py-3 text-charcoal-soft">
                    {product.totalStock} <span className="text-xs">({product.variantCount} variants)</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={product.isPublished ? "text-charcoal" : "text-charcoal-soft"}>
                        {product.isPublished ? "Published" : "Unpublished"}
                      </span>
                      {!product.isActive && <span className="text-xs text-blush-deep">Archived</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/products/${product.id}`} className="text-sm font-medium text-charcoal underline-offset-2 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination basePath="/admin/products" searchParams={{ q: params.q }} page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
