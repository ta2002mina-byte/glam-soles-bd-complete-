import type { Metadata } from "next";
import { CategoryListing } from "@/components/product/category-listing";
import { getProductListing } from "@/lib/supabase/queries";
import { parseListingSearchParams, toFlatParams, type RawListingSearchParams } from "@/lib/listing-params";

export const metadata: Metadata = {
  title: "Kids' Collection",
  description: "Girls, boys, school shoes, sneakers and sandals for kids.",
  alternates: { canonical: "/kids" },
  openGraph: { url: "/kids", title: "Kids' Collection — Glam Soles BD" },
};

const PAGE_SIZE = 24;

export default async function KidsPage({ searchParams }: { searchParams: Promise<RawListingSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, page } = parseListingSearchParams(sp);
  const { products, total, filterOptions } = await getProductListing({
    categorySlug: "kids",
    filters,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <CategoryListing
      category="kids"
      title="Kids' Collection"
      description="Girls, boys, school shoes, sneakers and sandals for kids."
      products={products}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
      searchParams={toFlatParams(sp)}
    />
  );
}
