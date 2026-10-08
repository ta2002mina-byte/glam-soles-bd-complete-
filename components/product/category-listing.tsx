import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { SortSelect } from "@/components/product/sort-select";
import { ListingPagination } from "@/components/product/listing-pagination";
import { SITE_NAME } from "@/lib/site-config";
import type { Product, ProductCategory } from "@/types";
import type { ProductListingFilterOptions } from "@/lib/supabase/queries";

interface CategoryListingProps {
  category: ProductCategory;
  title: string;
  description: string;
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  filterOptions: ProductListingFilterOptions;
  searchParams: Record<string, string | undefined>;
}

/**
 * Shared shell for the four top-level category pages (women/men/kids/
 * accessories) — heading, filter sidebar/drawer, sort, an ItemList
 * structured-data block for SEO, product grid, and pagination. Every
 * control (filters, sort, page) is URL-driven: changing one is a normal
 * Next.js navigation, so results are always server-rendered and shareable
 * via a plain link.
 */
export function CategoryListing({
  category,
  title,
  description,
  products,
  total,
  page,
  pageSize,
  filterOptions,
  searchParams,
}: CategoryListingProps) {
  const itemListStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${title} — ${SITE_NAME}`,
    description,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `/product/${product.slug}`,
        name: product.name,
      })),
    },
  };

  return (
    <div className="container-boutique py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListStructuredData) }}
      />

      <h1 className="text-3xl text-charcoal">{title}</h1>
      <p className="mt-1 text-sm text-charcoal-soft">{description}</p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <ProductFilters options={filterOptions} />

        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-charcoal-soft">
              {total} product{total === 1 ? "" : "s"}
            </p>
            <SortSelect />
          </div>

          <ProductGrid products={products} />

          <ListingPagination pathname={`/${category}`} searchParams={searchParams} page={page} pageSize={pageSize} total={total} />
        </div>
      </div>
    </div>
  );
}
