import type { ProductListingFilters, ProductSort } from "@/lib/supabase/queries";

export type RawListingSearchParams = Record<string, string | string[] | undefined>;

const SORT_VALUES: ProductSort[] = ["recommended", "newest", "best_selling", "price_asc", "price_desc", "rating_desc"];

// The header/footer link to /search?sort=newest, /search?sort=best-selling
// and /search?discount=true — accept the hyphenated spellings too so those
// existing links keep working.
const SORT_ALIASES: Record<string, ProductSort> = {
  "best-selling": "best_selling",
  "price-asc": "price_asc",
  "price-desc": "price_desc",
  "rating-desc": "rating_desc",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListingSearchParams(sp: RawListingSearchParams): {
  filters: ProductListingFilters;
  sort: ProductSort;
  page: number;
} {
  const rawSort = first(sp.sort) ?? "recommended";
  const sort = SORT_VALUES.includes(rawSort as ProductSort) ? (rawSort as ProductSort) : SORT_ALIASES[rawSort] ?? "recommended";

  const page = Math.max(1, Number(first(sp.page)) || 1);

  const toList = (v: string | string[] | undefined) => (first(v) ?? "").split(",").filter(Boolean);
  const toNumber = (v: string | string[] | undefined) => {
    const n = Number(first(v));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const discountParam = first(sp.discount);

  return {
    filters: {
      subcategorySlug: first(sp.subcategory) || undefined,
      brandIds: toList(sp.brand),
      colors: toList(sp.color),
      sizes: toList(sp.size),
      priceMin: toNumber(sp.price_min),
      priceMax: toNumber(sp.price_max),
      discountOnly: discountParam === "1" || discountParam === "true",
      inStockOnly: first(sp.instock) === "1",
      minRating: toNumber(sp.rating),
    },
    sort,
    page,
  };
}

/** Flattens searchParams to a plain string map for building pagination/filter links (Link href query strings). */
export function toFlatParams(sp: RawListingSearchParams): Record<string, string | undefined> {
  const flat: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(sp)) {
    const v = first(value);
    if (v) flat[key] = v;
  }
  return flat;
}
