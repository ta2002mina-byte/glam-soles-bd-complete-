import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { SortSelect } from "@/components/product/sort-select";
import { ListingPagination } from "@/components/product/listing-pagination";
import { SearchAutocomplete } from "@/components/product/search-autocomplete";
import { EmptyState } from "@/components/shared/empty-state";
import { getProductListing } from "@/lib/supabase/queries";
import { parseListingSearchParams, toFlatParams, type RawListingSearchParams } from "@/lib/listing-params";

// Search-result pages are excluded from indexing (thin/duplicate query-string
// content) — the four category pages and individual products carry the
// site's real SEO weight instead.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const SUGGESTIONS = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Kids", href: "/kids" },
  { label: "Accessories", href: "/accessories" },
  { label: "New Arrivals", href: "/search?sort=newest" },
  { label: "Best Sellers", href: "/search?sort=best-selling" },
];

const PAGE_SIZE = 24;

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawListingSearchParams> }) {
  const sp = await searchParams;
  const query = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const { filters, sort, page } = parseListingSearchParams(sp);

  // A shopper can land here either with a text query (?q=) or via a nav
  // link that only sets sort/discount (New Arrivals, Best Sellers, Sale) —
  // both are valid "browse everything, filtered/sorted" requests.
  const hasBrowseIntent = Boolean(query) || sort !== "recommended" || filters.discountOnly || filters.inStockOnly;

  const { products, total, filterOptions } = hasBrowseIntent
    ? await getProductListing({ query: query || undefined, filters, sort, page, pageSize: PAGE_SIZE })
    : { products: [], total: 0, filterOptions: { subcategories: [], brands: [], colors: [], sizes: [], priceMin: 0, priceMax: 0 } };

  return (
    <div className="container-boutique py-8 md:py-12">
      <h1 className="mb-6 text-3xl text-charcoal">Search</h1>
      <div className="mb-8 max-w-lg">
        <SearchAutocomplete placeholder="Search for shoes, brands, styles..." />
      </div>

      {!hasBrowseIntent ? (
        <EmptyState
          title="What are you looking for?"
          description="Search by product name, brand or style to get started."
        />
      ) : total === 0 ? (
        <EmptyState
          title="Nothing found. Let's try something else."
          description={query ? `No results for "${query}".` : undefined}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="rounded-full border border-line px-4 py-1.5 text-xs text-charcoal-soft hover:bg-cream"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          }
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <ProductFilters options={filterOptions} />
          <div className="flex-1">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-charcoal-soft">
                {total} result{total === 1 ? "" : "s"}
                {query && <> for &quot;{query}&quot;</>}
              </p>
              <SortSelect />
            </div>
            <ProductGrid products={products} />
            <ListingPagination pathname="/search" searchParams={toFlatParams(sp)} page={page} pageSize={PAGE_SIZE} total={total} />
          </div>
        </div>
      )}
    </div>
  );
}
