import type { Metadata } from "next";
import { CategoryListing } from "@/components/product/category-listing";
import { getProductListing } from "@/lib/supabase/queries";
import { parseListingSearchParams, toFlatParams, type RawListingSearchParams } from "@/lib/listing-params";

export const metadata: Metadata = {
  title: "Accessories",
  description: "Bags, wallets, belts and other accessories.",
  alternates: { canonical: "/accessories" },
  openGraph: { url: "/accessories", title: "Accessories — Glam Soles BD" },
};

const PAGE_SIZE = 24;

export default async function AccessoriesPage({ searchParams }: { searchParams: Promise<RawListingSearchParams> }) {
  const sp = await searchParams;
  const { filters, sort, page } = parseListingSearchParams(sp);
  const { products, total, filterOptions } = await getProductListing({
    categorySlug: "accessories",
    filters,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <CategoryListing
      category="accessories"
      title="Accessories"
      description="Bags, wallets, belts and other accessories."
      products={products}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filterOptions={filterOptions}
      searchParams={toFlatParams(sp)}
    />
  );
}
