import Link from "next/link";
import type { Product } from "@/types";
import { ProductGrid } from "@/components/product/product-grid";

interface CollectionSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function CollectionSection({
  title,
  subtitle,
  products,
  viewAllHref,
  emptyTitle,
  emptyDescription,
}: CollectionSectionProps) {
  return (
    <section className="mt-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl text-charcoal">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-charcoal-soft">{subtitle}</p>}
        </div>
        {viewAllHref && products.length > 0 && (
          <Link href={viewAllHref} className="shrink-0 text-sm font-medium text-charcoal underline-offset-4 hover:underline">
            View all
          </Link>
        )}
      </div>
      {products.length === 0 && (emptyTitle || emptyDescription) ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] bg-cream/60 py-14 text-center">
          <p className="text-base text-charcoal">{emptyTitle ?? "Nothing here yet"}</p>
          {emptyDescription && <p className="max-w-sm text-sm text-charcoal-soft">{emptyDescription}</p>}
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
