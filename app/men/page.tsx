import type { Metadata } from "next";
import { CategoryListing } from "@/components/product/category-listing";
import { getProductListing } from "@/lib/supabase/queries";
import { parseListingSearchParams, toFlatParams, type RawListingSearchParams } from "@/lib/listing-params";

export const metadata: Metadata = {
  title: "Men's Collection",
  description: "Sneakers, loafers, formal shoes, sandals and boots for men.",
  alternates: { canonical: "/men" },
  openGraph: { url: "/men", title: "Men's Collection — Glam Soles BD" },
};

const PAGE_SIZE = 24;

export default async function MenPage({ searchParams }: { searchParams: Promise<RawListingSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, page } = parseListingSearchParams(sp);
  const { products, total, filterOptions } = await getProductListing({
    categorySlug: "men",
    filters,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <CategoryListing
      category="men"
      title="Men's Collection"
      description="Sneakers, loafers, formal shoes, sandals and boots for men."
      products={products}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
      searchParams={toFlatParams(sp)}
    />
  );
}
