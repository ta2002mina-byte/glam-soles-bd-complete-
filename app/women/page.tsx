import type { Metadata } from "next";
import { CategoryListing } from "@/components/product/category-listing";
import { getProductListing } from "@/lib/supabase/queries";
import { parseListingSearchParams, toFlatParams, type RawListingSearchParams } from "@/lib/listing-params";

export const metadata: Metadata = {
  title: "Women's Collection",
  description: "Heels, flats, sandals, sneakers, loafers and boots for women.",
  alternates: { canonical: "/women" },
  openGraph: { url: "/women", title: "Women's Collection — Glam Soles BD" },
};

const PAGE_SIZE = 24;

export default async function WomenPage({ searchParams }: { searchParams: Promise<RawListingSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, page } = parseListingSearchParams(sp);
  const { products, total, filterOptions } = await getProductListing({
    categorySlug: "women",
    filters,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <CategoryListing
      category="women"
      title="Women's Collection"
      description="Heels, flats, sandals, sneakers, loafers and boots for women."
      products={products}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
      searchParams={toFlatParams(sp)}
    />
  );
}
