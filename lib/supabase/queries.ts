// Server-only data layer: relies on lib/supabase/server (cookie-based
// SSR client) and must only be imported from Server Components, Route
// Handlers, or Server Actions — never from "use client" files.
import { createClient } from "@/lib/supabase/server";
import { toUiOrderStatus, toUiPaymentStatus } from "@/lib/utils";
import type {
  AccountOrderSummary,
  AccountProfile,
  Address,
  AvailableCouponSummary,
  CartLine,
  CartLineValidation,
  CouponPreview,
  CouponUsageSummary,
  MyReviewSummary,
  NotificationSummary,
  OrderTrackingDetail,
  Product,
  ProductCategory,
  ProductVariant,
  Review,
  ReturnEligibleItem,
  ReturnRequestSummary,
  RewardSummary,
  ShippingSettingsPreview,
  TrackOrderResult,
} from "@/types";
import type { BannerPlacement, DbBanner, DbCoupon, DbShippingSettings } from "@/types/database";

// ---------- shared shapes returned by our Supabase select strings ----------

interface RawProductRow {
  id: string;
  slug: string;
  name: string;
  regular_price: number;
  sale_price: number | null;
  images: string[] | null;
  tags: string[] | null;
  created_at: string;
  categories: {
    id?: string;
    name: string;
    slug: string;
    parent_id: string | null;
    parent_category: { slug: string } | null;
  } | null;
  product_variants: { id: string; color: string; size: string; sku: string; stock: number }[] | null;
  reviews: { rating: number; is_approved: boolean }[] | null;
  brands?: { name: string } | { name: string }[] | null;
}

// `categories:category_id` embeds the product's own (usually sub-)category;
// `parent_category:parent_id` follows that same row's self-referencing FK
// one level up so we can resolve the top-level Women/Men/Kids/Accessories
// slug in a single query — no N+1 lookups.
const PRODUCT_SELECT = `
  id, slug, name, regular_price, sale_price, images, tags, created_at,
  categories:category_id ( id, name, slug, parent_id, parent_category:parent_id ( slug ) ),
  brands:brand_id ( name ),
  product_variants ( id, color, size, sku, stock ),
  reviews ( rating, is_approved )
`;

/** Resolves the top-level storefront category (women/men/kids/accessories) a product belongs to. */
function topCategorySlug(row: RawProductRow): ProductCategory {
  const slug = row.categories?.parent_category?.slug ?? row.categories?.slug;
  if (slug === "women" || slug === "men" || slug === "kids" || slug === "accessories") return slug;
  return "accessories";
}

/** Server-side discount calc — mirrors product_discount_percent() in SQL. Never trust a client-supplied discount. */
function discountPercent(regular: number, sale: number | null): number | undefined {
  if (!sale || sale <= 0 || sale >= regular) return undefined;
  return Math.round(((regular - sale) / regular) * 100);
}

function mapRow(row: RawProductRow, category: ProductCategory): Product {
  const approvedRatings = (row.reviews ?? []).filter((r) => r.is_approved).map((r) => r.rating);
  const reviewCount = approvedRatings.length;
  const rating = reviewCount
    ? Math.round((approvedRatings.reduce((s, r) => s + r, 0) / reviewCount) * 10) / 10
    : undefined;

  const rawVariants = row.product_variants ?? [];
  const colors = Array.from(new Set(rawVariants.map((v) => v.color))).filter(Boolean);
  const isNew = Date.now() - new Date(row.created_at).getTime() < 1000 * 60 * 60 * 24 * 30; // 30 days
  // A product is only actually purchasable if it has at least one real
  // variant/SKU with stock — cart/order lines always reference a variant
  // row, so a product with zero variants has nothing sellable to add.
  const inStock = rawVariants.length > 0 && rawVariants.some((v) => v.stock > 0);
  const price =
    row.sale_price && row.sale_price > 0 && row.sale_price < row.regular_price ? row.sale_price : row.regular_price;
  const oldPrice =
    row.sale_price && row.sale_price > 0 && row.sale_price < row.regular_price ? row.regular_price : undefined;
  const brandRaw = row.brands;
  const brand = Array.isArray(brandRaw) ? brandRaw[0]?.name : brandRaw?.name;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category,
    subcategory: row.categories?.name ?? "",
    brand,
    price,
    oldPrice,
    discountPercent: discountPercent(row.regular_price, row.sale_price),
    rating,
    reviewCount: reviewCount || undefined,
    colors,
    images: row.images ?? [],
    isNew,
    inStock,
    // Lightweight variant summary (no per-variant price override/images) —
    // enough for wishlist/cart cards to know whether a single SKU can be
    // added directly or whether the shopper needs to pick options.
    variants: rawVariants.map((v) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
    })),
  };
}

/**
 * Fetches published products belonging to a top-level category (by slug),
 * including its subcategories. One query, no N+1 — variants and reviews
 * are embedded via Supabase's foreign-table select.
 */
export async function getProductsByCategorySlug(
  categorySlug: ProductCategory,
  limit = 8
): Promise<Product[]> {
  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!parent) return [];

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .or(`id.eq.${parent.id},parent_id.eq.${parent.id}`);

  const categoryIds = (children ?? [parent]).map((c) => c.id);
  if (categoryIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("category_id", categoryIds)
    .eq("is_published", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RawProductRow[]>();

  if (error || !data) return [];
  return data.map((row) => mapRow(row, categorySlug));
}

/**
 * Paged variant of {@link getProductsByCategorySlug} for "Load more" on
 * category listing pages (Phase 11 performance polish) — avoids fetching
 * an unbounded product list up front. Returns whether another page exists
 * via a cheap `head`-count query rather than over-fetching.
 */
export async function getProductsByCategorySlugPaged(
  categorySlug: ProductCategory,
  offset: number,
  limit: number
): Promise<{ products: Product[]; hasMore: boolean }> {
  const supabase = await createClient();

  const { data: parent } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!parent) return { products: [], hasMore: false };

  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .or(`id.eq.${parent.id},parent_id.eq.${parent.id}`);

  const categoryIds = (children ?? [parent]).map((c) => c.id);
  if (categoryIds.length === 0) return { products: [], hasMore: false };

  const { data, error, count } = await supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .in("category_id", categoryIds)
    .eq("is_published", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<RawProductRow[]>();

  if (error || !data) return { products: [], hasMore: false };

  const products = data.map((row) => mapRow(row, categorySlug));
  const hasMore = typeof count === "number" ? offset + products.length < count : products.length === limit;
  return { products, hasMore };
}

/**
 * Real product search (Phase 11 polish) — case-insensitive match on name,
 * tags and SKU-bearing variants, restricted to published/active products.
 * Replaces the placeholder-data search used before this phase.
 */
export async function searchProducts(query: string, limit = 60): Promise<Product[]> {
  const supabase = await createClient();
  // Strip characters that have special meaning inside a PostgREST .or()
  // filter string so a search term can never alter the query's structure.
  const q = query.trim().replace(/[,()]/g, "");
  if (!q) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_published", true)
    .eq("is_active", true)
    .or(`name.ilike.%${q}%,tags.cs.{${q}}`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RawProductRow[]>();

  if (error || !data) return [];
  return data.map((row) => mapRow(row, topCategorySlug(row)));
}

/**
 * Slugs + last-modified timestamps for every published product, for the
 * dynamic sitemap. Deliberately narrow select — no images/variants/reviews.
 */
export async function getAllPublishedProductSlugs(): Promise<
  { slug: string; category: ProductCategory; updatedAt: string }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      "slug, updated_at, categories:category_id ( slug, parent_category:parent_id ( slug ) )"
    )
    .eq("is_published", true)
    .eq("is_active", true)
    .returns<
      { slug: string; updated_at: string; categories: { slug: string; parent_category: { slug: string } | null } | null }[]
    >();

  if (error || !data) return [];

  return data.map((row) => {
    const slug = row.categories?.parent_category?.slug ?? row.categories?.slug;
    const category: ProductCategory =
      slug === "women" || slug === "men" || slug === "kids" || slug === "accessories" ? slug : "accessories";
    return { slug: row.slug, category, updatedAt: row.updated_at };
  });
}

/** Newest published products across all categories, real created_at order — no invented "new" flags. */
export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_published", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RawProductRow[]>();

  if (error || !data) return [];
  return data.map((row) => mapRow(row, topCategorySlug(row)));
}

/**
 * Best sellers, ranked by real order data via the get_best_selling_products
 * RPC (see migrations/009). Returns [] when there is no real sales history
 * yet — the homepage shows an empty state rather than fake metrics.
 */
export async function getBestSellers(limit = 8): Promise<Product[]> {
  const supabase = await createClient();

  const { data: ranked, error: rpcError } = await supabase.rpc("get_best_selling_products", {
    p_limit: limit,
  });

  if (rpcError || !ranked || ranked.length === 0) return [];

  const ids = ranked.map((r: { product_id: string }) => r.product_id);

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids)
    .eq("is_published", true)
    .eq("is_active", true)
    .returns<RawProductRow[]>();

  if (error || !data) return [];

  // Preserve the RPC's sales-ranked order.
  const bySalesRank = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  return data
    .map((row) => mapRow(row, topCategorySlug(row)))
    .sort((a, b) => (bySalesRank.get(a.id) ?? 0) - (bySalesRank.get(b.id) ?? 0));
}

// ============================================================
// Phase 4 — category filters/sort + search autocomplete
// ============================================================

export type ProductSort = "recommended" | "newest" | "best_selling" | "price_asc" | "price_desc" | "rating_desc";

export interface ProductListingFilters {
  subcategorySlug?: string;
  brandIds?: string[];
  colors?: string[];
  sizes?: string[];
  priceMin?: number;
  priceMax?: number;
  discountOnly?: boolean;
  inStockOnly?: boolean;
  minRating?: number;
}

export interface ProductListingFilterOptions {
  subcategories: { slug: string; name: string }[];
  brands: { id: string; name: string }[];
  colors: string[];
  sizes: string[];
  priceMin: number;
  priceMax: number;
}

export interface ProductListingResult {
  products: Product[];
  total: number;
  hasMore: boolean;
  filterOptions: ProductListingFilterOptions;
}

interface RawProductRowWithBrandId extends RawProductRow {
  brand_id: string | null;
}

const PRODUCT_SELECT_WITH_BRAND_ID = `
  id, slug, name, regular_price, sale_price, images, tags, created_at, brand_id,
  categories:category_id ( id, name, slug, parent_id, parent_category:parent_id ( slug ) ),
  brands:brand_id ( name ),
  product_variants ( id, color, size, sku, stock ),
  reviews ( rating, is_approved )
`;

/**
 * One shared query behind every category page (/women, /men, /kids,
 * /accessories) and the search results page. Two scoping modes, usable
 * together or alone:
 *   - `categorySlug` restricts to a top-level category (+ its subcategories,
 *     or one specific subcategory via `filters.subcategorySlug`).
 *   - `query` full-text-matches name/tags (same as {@link searchProducts}).
 *
 * Design note: category/brand/published/active filters run in Postgres
 * (indexed columns), but color/size/price/discount/rating filtering and
 * all sorting run in JS over that already-scoped candidate set (capped at
 * CANDIDATE_CAP). For a boutique catalog (hundreds, not hundreds of
 * thousands, of products per category) this is one round trip and is far
 * simpler than expressing "has a variant matching every one of N selected
 * sizes AND every one of M selected colors" as a single PostgREST filter
 * string. filterOptions are derived from the pre-filter candidate set (not
 * the post-filter results) so available options don't disappear as the
 * shopper narrows down — standard faceted-search UX.
 */
const CANDIDATE_CAP = 500;

export async function getProductListing(params: {
  categorySlug?: ProductCategory;
  query?: string;
  filters?: ProductListingFilters;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}): Promise<ProductListingResult> {
  const supabase = await createClient();
  const filters = params.filters ?? {};
  const sort = params.sort ?? "recommended";
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 24;
  const empty: ProductListingResult = {
    products: [],
    total: 0,
    hasMore: false,
    filterOptions: { subcategories: [], brands: [], colors: [], sizes: [], priceMin: 0, priceMax: 0 },
  };

  let categoryIds: string[] | null = null;
  let subcategoryOptions: { slug: string; name: string }[] = [];

  if (params.categorySlug) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", params.categorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (!parent) return empty;

    const { data: children } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("parent_id", parent.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    subcategoryOptions = (children ?? []).map((c) => ({ slug: c.slug as string, name: c.name as string }));

    if (filters.subcategorySlug) {
      const match = (children ?? []).find((c) => c.slug === filters.subcategorySlug);
      if (!match) return empty; // unknown subcategory for this category — no results, not an error
      categoryIds = [match.id as string];
    } else {
      categoryIds = [parent.id as string, ...(children ?? []).map((c) => c.id as string)];
    }
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT_WITH_BRAND_ID)
    .eq("is_published", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_CAP);

  if (categoryIds) query = query.in("category_id", categoryIds);

  const textQuery = params.query?.trim().replace(/[,()]/g, "");
  if (textQuery) query = query.or(`name.ilike.%${textQuery}%,tags.cs.{${textQuery}}`);

  if (filters.brandIds && filters.brandIds.length > 0) query = query.in("brand_id", filters.brandIds);

  const { data, error } = await query.returns<RawProductRowWithBrandId[]>();
  if (error || !data) return empty;

  // ---------- Facet options, derived from the full (pre-user-filter) candidate set ----------
  const brandMap = new Map<string, string>();
  const colorSet = new Set<string>();
  const sizeSet = new Set<string>();
  let priceMin = Infinity;
  let priceMax = 0;

  for (const row of data) {
    const brandRaw = row.brands;
    const brandName = Array.isArray(brandRaw) ? brandRaw[0]?.name : brandRaw?.name;
    if (row.brand_id && brandName) brandMap.set(row.brand_id, brandName);
    for (const v of row.product_variants ?? []) {
      if (v.color) colorSet.add(v.color);
      if (v.size) sizeSet.add(v.size);
    }
    const effectivePrice =
      row.sale_price && row.sale_price > 0 && row.sale_price < row.regular_price ? row.sale_price : row.regular_price;
    priceMin = Math.min(priceMin, effectivePrice);
    priceMax = Math.max(priceMax, effectivePrice);
  }
  if (!Number.isFinite(priceMin)) priceMin = 0;

  const filterOptions: ProductListingFilterOptions = {
    subcategories: subcategoryOptions,
    brands: Array.from(brandMap.entries()).map(([id, name]) => ({ id, name })),
    colors: Array.from(colorSet).sort(),
    sizes: Array.from(sizeSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    priceMin,
    priceMax,
  };

  // ---------- Map + apply the remaining (JS-side) filters ----------
  let products = data.map((row) => mapRow(row, params.categorySlug ?? topCategorySlug(row)));

  if (filters.colors && filters.colors.length > 0) {
    const wanted = new Set(filters.colors);
    products = products.filter((p) => p.colors.some((c) => wanted.has(c)));
  }
  if (filters.sizes && filters.sizes.length > 0) {
    const wanted = new Set(filters.sizes);
    products = products.filter((p) => (p.variants ?? []).some((v) => wanted.has(v.size)));
  }
  if (typeof filters.priceMin === "number") products = products.filter((p) => p.price >= filters.priceMin!);
  if (typeof filters.priceMax === "number") products = products.filter((p) => p.price <= filters.priceMax!);
  if (filters.discountOnly) products = products.filter((p) => (p.discountPercent ?? 0) > 0);
  if (filters.inStockOnly) products = products.filter((p) => p.inStock);
  if (typeof filters.minRating === "number") products = products.filter((p) => (p.rating ?? 0) >= filters.minRating!);

  // ---------- Sort ----------
  if (sort === "price_asc") {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === "rating_desc") {
    products.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sort === "best_selling") {
    const { data: ranked } = await supabase.rpc("get_best_selling_products", { p_limit: 2000 });
    const rankMap = new Map<string, number>(
      (ranked ?? []).map((r: { product_id: string; units_sold: number }, i: number) => [r.product_id, i])
    );
    products.sort((a, b) => {
      const ra = rankMap.has(a.id) ? rankMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const rb = rankMap.has(b.id) ? rankMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }
  // "recommended" and "newest" both use the default created_at-desc order
  // the query was already run in — there's no separate recommendation
  // signal to sort by, so "recommended" is honestly just newest-first.

  const total = products.length;
  const start = (page - 1) * pageSize;
  const pageItems = products.slice(start, start + pageSize);
  const hasMore = start + pageItems.length < total;

  return { products: pageItems, total, hasMore, filterOptions };
}

export interface SearchSuggestion {
  products: { id: string; name: string; slug: string; image: string | null; price: number }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}

/**
 * Lightweight, fast query behind the debounced search-autocomplete dropdown
 * — small limits, no variant/review embeds, distinct from the full
 * {@link getProductListing}/{@link searchProducts} used for results pages.
 */
export async function getSearchSuggestions(rawQuery: string): Promise<SearchSuggestion> {
  const empty: SearchSuggestion = { products: [], categories: [], brands: [] };
  const q = rawQuery.trim().replace(/[,()%]/g, "");
  if (q.length < 2) return empty;

  const supabase = await createClient();

  const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, images, regular_price, sale_price")
      .eq("is_published", true)
      .eq("is_active", true)
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(6),
    supabase
      .from("categories")
      .select("name, slug")
      .eq("is_active", true)
      .ilike("name", `%${q}%`)
      .limit(4),
    supabase.from("brands").select("name, slug").ilike("name", `%${q}%`).limit(4),
  ]);

  return {
    products: (products ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      slug: p.slug as string,
      image: ((p.images as string[] | null) ?? [])[0] ?? null,
      price:
        p.sale_price && (p.sale_price as number) > 0 && (p.sale_price as number) < (p.regular_price as number)
          ? (p.sale_price as number)
          : (p.regular_price as number),
    })),
    categories: (categories ?? []) as { name: string; slug: string }[],
    brands: (brands ?? []) as { name: string; slug: string }[],
  };
}

export interface TopLevelCategory {
  slug: ProductCategory;
  name: string;
  description: string | null;
  bannerImageUrl: string | null;
}

/**
 * The four top-level storefront categories (women/men/kids/accessories),
 * with whatever real name/description/banner image is set in Supabase —
 * no hardcoded copy or fake imagery.
 */
export async function getTopLevelCategories(): Promise<TopLevelCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("name, slug, description, banner_image_url, sort_order")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<{ name: string; slug: string; description: string | null; banner_image_url: string | null }[]>();

  if (error || !data) return [];

  return data
    .filter((c): c is typeof c & { slug: ProductCategory } =>
      c.slug === "women" || c.slug === "men" || c.slug === "kids" || c.slug === "accessories"
    )
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      bannerImageUrl: c.banner_image_url,
    }));
}

/** Active banners for a given placement, respecting scheduled start/end dates. Public read is enforced by RLS too. */
export async function getActiveBanners(placement: BannerPlacement): Promise<DbBanner[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("sort_order", { ascending: true })
    .returns<DbBanner[]>();

  if (error || !data) return [];
  return data;
}

// ============================================================
// Product details (Phase 5)
// ============================================================

interface RawProductDetailRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  description: string | null;
  materials: string | null;
  features: string[] | null;
  size_fit_notes: string | null;
  regular_price: number;
  sale_price: number | null;
  images: string[] | null;
  video_url: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
  brands: { name: string } | null;
  categories: {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    parent_category: { slug: string } | null;
  } | null;
  product_variants: {
    id: string;
    color: string;
    size: string;
    sku: string;
    price_override: number | null;
    stock: number;
    images: string[] | null;
  }[] | null;
  reviews: { rating: number; is_approved: boolean }[] | null;
}

const PRODUCT_DETAIL_SELECT = `
  id, slug, name, sku, description, materials, features, size_fit_notes,
  regular_price, sale_price, images, video_url, tags, seo_title, seo_description,
  is_published, is_active, created_at,
  brands:brand_id ( name ),
  categories:category_id ( id, name, slug, parent_id, parent_category:parent_id ( slug ) ),
  product_variants ( id, color, size, sku, price_override, stock, images ),
  reviews ( rating, is_approved )
`;

function topCategorySlugFromDetail(row: RawProductDetailRow): ProductCategory {
  const slug = row.categories?.parent_category?.slug ?? row.categories?.slug;
  if (slug === "women" || slug === "men" || slug === "kids" || slug === "accessories") return slug;
  return "accessories";
}

function mapDetailRow(row: RawProductDetailRow): Product {
  const approvedRatings = (row.reviews ?? []).filter((r) => r.is_approved).map((r) => r.rating);
  const reviewCount = approvedRatings.length;
  const rating = reviewCount
    ? Math.round((approvedRatings.reduce((s, r) => s + r, 0) / reviewCount) * 10) / 10
    : undefined;

  const variants: ProductVariant[] = (row.product_variants ?? []).map((v) => ({
    id: v.id,
    color: v.color,
    size: v.size,
    sku: v.sku,
    stock: v.stock,
    priceOverride: v.price_override ?? undefined,
    images: v.images && v.images.length > 0 ? v.images : undefined,
  }));

  const colors = Array.from(new Set(variants.map((v) => v.color))).filter(Boolean);
  const inStock = variants.length > 0 ? variants.some((v) => v.stock > 0) : true;
  const isNew = Date.now() - new Date(row.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;

  const price =
    row.sale_price && row.sale_price > 0 && row.sale_price < row.regular_price
      ? row.sale_price
      : row.regular_price;
  const oldPrice =
    row.sale_price && row.sale_price > 0 && row.sale_price < row.regular_price
      ? row.regular_price
      : undefined;
  const discountPercent =
    oldPrice && oldPrice > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    category: topCategorySlugFromDetail(row),
    subcategory: row.categories?.name ?? "",
    brand: row.brands?.name ?? undefined,
    description: row.description ?? undefined,
    materials: row.materials ?? undefined,
    features: row.features ?? undefined,
    sizeFitNotes: row.size_fit_notes ?? undefined,
    videoUrl: row.video_url ?? undefined,
    price,
    oldPrice,
    discountPercent,
    rating,
    reviewCount: reviewCount || undefined,
    colors,
    images: row.images ?? [],
    isNew,
    inStock,
    variants,
  };
}

/**
 * Fetches one published product by slug with its variants and review
 * aggregate in a single query (no N+1). Returns null for a missing,
 * unpublished, or inactive slug so the page can render notFound().
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .eq("is_active", true)
    .maybeSingle()
    .returns<RawProductDetailRow>();

  if (error || !data) return null;
  return mapDetailRow(data);
}

/** Lightweight product cards for a known list of product IDs (recently viewed, complete-the-look, etc). Preserves no particular order beyond what the DB returns; callers re-sort if order matters. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids)
    .eq("is_published", true)
    .eq("is_active", true)
    .returns<RawProductRow[]>();

  if (error || !data) return [];
  return data.map((row) => mapRow(row, topCategorySlug(row)));
}

/** "You May Also Like" / "Related Products" — same category, via get_related_products RPC. */
export async function getRelatedProducts(productId: string, limit = 8): Promise<Product[]> {
  const supabase = await createClient();

  const { data: ranked, error: rpcError } = await supabase.rpc("get_related_products", {
    p_product_id: productId,
    p_limit: limit,
  });

  if (rpcError || !ranked || ranked.length === 0) return [];
  const ids = ranked.map((r: { product_id: string }) => r.product_id);
  return getProductsByIds(ids);
}

/** "Frequently Bought Together" — ranked by real co-purchase counts. Empty when there's no sales history yet. */
export async function getFrequentlyBoughtTogether(productId: string, limit = 4): Promise<Product[]> {
  const supabase = await createClient();

  const { data: ranked, error: rpcError } = await supabase.rpc("get_frequently_bought_together", {
    p_product_id: productId,
    p_limit: limit,
  });

  if (rpcError || !ranked || ranked.length === 0) return [];

  const ids = ranked.map((r: { product_id: string }) => r.product_id);
  const products = await getProductsByIds(ids);
  const byRank = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  return products.sort((a, b) => (byRank.get(a.id) ?? 0) - (byRank.get(b.id) ?? 0));
}

interface RawReviewRow {
  id: string;
  rating: number;
  body: string | null;
  size_feedback: string | null;
  photo_urls: string[] | null;
  is_verified_purchase: boolean;
  created_at: string;
  author_display_name: string;
}

/** Approved reviews for a product with a masked author name (never the full profile). */
export async function getProductReviews(productId: string): Promise<Review[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_product_reviews", { p_product_id: productId });
  const rows = (data ?? null) as RawReviewRow[] | null;

  if (error || !rows) return [];

  return rows.map((r) => ({
    id: r.id,
    productId,
    userId: "",
    authorName: r.author_display_name,
    rating: r.rating,
    body: r.body,
    sizeFeedback: r.size_feedback,
    photoUrls: r.photo_urls ?? [],
    isVerifiedPurchase: r.is_verified_purchase,
    createdAt: r.created_at,
  }));
}

export interface ReviewEligibility {
  isSignedIn: boolean;
  hasReviewed: boolean;
  hasDeliveredPurchase: boolean;
}

/** Whether the current visitor can write a review for this product (auth-gated, server-checked). */
export async function getMyReviewEligibility(productId: string): Promise<ReviewEligibility> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isSignedIn: false, hasReviewed: false, hasDeliveredPurchase: false };

  const { data, error } = await supabase.rpc("get_my_review_eligibility", { p_product_id: productId });
  const rows = (data ?? null) as { has_reviewed: boolean; has_delivered_purchase: boolean }[] | null;

  if (error || !rows || rows.length === 0) {
    return { isSignedIn: true, hasReviewed: false, hasDeliveredPurchase: false };
  }

  return {
    isSignedIn: true,
    hasReviewed: rows[0].has_reviewed,
    hasDeliveredPurchase: rows[0].has_delivered_purchase,
  };
}

// ============================================================
// Cart, Wishlist, Coupons & Shipping (Phase 6)
// ============================================================

interface RawVariantForValidation {
  id: string;
  color: string;
  size: string;
  price_override: number | null;
  stock: number;
  images: string[] | null;
  products: {
    id: string;
    slug: string;
    name: string;
    images: string[] | null;
    regular_price: number;
    sale_price: number | null;
    is_active: boolean;
    is_published: boolean;
    category_id: string;
  } | null;
}

/**
 * Re-reads current price/stock/availability for a set of {variantId,
 * quantity} pairs directly from the database — the only source of truth
 * for what a cart line is actually worth. Never trust a client-supplied
 * price, name, image or stock count. Used by the cart page (to warn about
 * price changes / sold-out lines) and will be reused by checkout (Phase 7)
 * before an order is ever created.
 */
export async function validateCartLines(
  items: { variantId: string; quantity: number }[]
): Promise<CartLineValidation[]> {
  if (items.length === 0) return [];
  const supabase = await createClient();
  const ids = Array.from(new Set(items.map((i) => i.variantId)));

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `id, color, size, price_override, stock, images,
       products:product_id ( id, slug, name, images, regular_price, sale_price, is_active, is_published, category_id )`
    )
    .in("id", ids)
    .returns<RawVariantForValidation[]>();

  const byId = new Map((data ?? []).map((row) => [row.id, row]));

  return items.map(({ variantId, quantity }) => {
    const row = error ? undefined : byId.get(variantId);
    const product = row?.products;
    const isSellable = Boolean(row && product && product.is_active && product.is_published);

    if (!isSellable || !row || !product) {
      return {
        variantId,
        valid: false,
        productId: "",
        slug: "",
        name: "This item is no longer available",
        image: "/images/product-fallback.svg",
        color: "",
        size: "",
        currentPrice: 0,
        currentStock: 0,
        requestedQuantity: quantity,
        adjustedQuantity: 0,
        outOfStock: true,
      };
    }

    const currentPrice =
      row.price_override ??
      (product.sale_price && product.sale_price > 0 && product.sale_price < product.regular_price
        ? product.sale_price
        : product.regular_price);

    const image = row.images?.[0] ?? product.images?.[0] ?? "/images/product-fallback.svg";
    const adjustedQuantity = Math.max(0, Math.min(quantity, row.stock));

    return {
      variantId,
      valid: true,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      color: row.color,
      size: row.size,
      currentPrice,
      currentStock: row.stock,
      requestedQuantity: quantity,
      adjustedQuantity,
      outOfStock: row.stock <= 0,
    };
  });
}

/** Real, admin-controlled shipping fees for cart-page display. Final zone/fee is confirmed at checkout. */
export async function getShippingSettings(): Promise<ShippingSettingsPreview> {
  const supabase = await createClient();
  const { data: rawData } = await supabase.from("shipping_settings").select("*").eq("id", 1).maybeSingle();
  const data = rawData as DbShippingSettings | null;

  return {
    insideDhakaFee: data?.inside_dhaka_fee ?? 60,
    outsideDhakaFee: data?.outside_dhaka_fee ?? 120,
    expressFee: data?.express_fee ?? 150,
    expressEnabled: data?.express_enabled ?? false,
    freeShippingThreshold: data?.free_shipping_threshold ?? null,
  };
}

/**
 * Validates a coupon code against real, current cart contents. This is a
 * read-only PREVIEW (never increments usage_count / writes coupon_usage —
 * that only happens inside the create_order RPC at checkout in Phase 7).
 * Subtotal and category membership are recomputed from server-verified
 * cart lines, never taken from the client.
 */
export async function previewCoupon(
  code: string,
  items: { variantId: string; quantity: number }[]
): Promise<CouponPreview> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { status: "invalid", message: "Enter a coupon code." };

  const supabase = await createClient();

  const validated = await validateCartLines(items);
  const sellable = validated.filter((v) => v.valid && !v.outOfStock);
  if (sellable.length === 0) {
    return { status: "invalid", message: "Your bag doesn't have any items this code can apply to." };
  }
  const subtotal = sellable.reduce((sum, v) => sum + v.currentPrice * v.adjustedQuantity, 0);

  const { data: rawCoupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();
  const coupon = rawCoupon as DbCoupon | null;

  if (error || !coupon) {
    return { status: "invalid", message: "This coupon code is invalid or has expired." };
  }

  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { status: "invalid", message: "This coupon isn't active yet." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
    return { status: "invalid", message: "This coupon has expired." };
  }
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return { status: "invalid", message: "This coupon has reached its usage limit." };
  }
  if (subtotal < coupon.min_order_amount) {
    return {
      status: "invalid",
      message: `Add ${coupon.min_order_amount.toLocaleString("en-BD")} more to your bag to use this code.`,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (coupon.membership_tier_required) {
    if (!user) {
      return { status: "invalid", message: "Sign in to use this membership coupon." };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("membership_tier")
      .eq("id", user.id)
      .maybeSingle();
    const tierOrder = ["bronze", "silver", "gold", "platinum"];
    const required = tierOrder.indexOf(coupon.membership_tier_required);
    const held = tierOrder.indexOf(profile?.membership_tier ?? "bronze");
    if (held < required) {
      return { status: "invalid", message: `This coupon requires ${coupon.membership_tier_required} membership or above.` };
    }
  }

  if (coupon.first_order_only) {
    if (!user) {
      return { status: "invalid", message: "Sign in to use this first-order coupon." };
    }
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) > 0) {
      return { status: "invalid", message: "This coupon is only valid on your first order." };
    }
  }

  if (coupon.applies_to_category_id) {
    const { data: eligibleProducts } = await supabase
      .from("products")
      .select("id")
      .eq("category_id", coupon.applies_to_category_id)
      .in("id", sellable.map((v) => v.productId));
    if (!eligibleProducts || eligibleProducts.length === 0) {
      return { status: "invalid", message: "This coupon doesn't apply to the items in your bag." };
    }
  }

  const settings = await getShippingSettings();

  const discountAmount =
    coupon.type === "percentage"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : coupon.type === "fixed"
        ? Math.min(coupon.value, subtotal)
        : settings.insideDhakaFee; // free_delivery

  return {
    status: "valid",
    code: coupon.code,
    type: coupon.type,
    discountAmount,
    message:
      coupon.type === "free_delivery"
        ? "Free delivery applied."
        : `Coupon applied — you're saving ${discountAmount.toLocaleString("en-BD")}.`,
  };
}

interface RawCartItemRow {
  variant_id: string;
  quantity: number;
  product_variants: {
    id: string;
    color: string;
    size: string;
    price_override: number | null;
    stock: number;
    images: string[] | null;
    products: {
      id: string;
      slug: string;
      name: string;
      images: string[] | null;
      regular_price: number;
      sale_price: number | null;
    } | null;
  } | null;
}

/** The signed-in shopper's persisted cart, hydrated with live price/image/stock. Empty for guests (their cart lives in localStorage only). */
export async function getServerCartLines(): Promise<CartLine[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (!cart) return [];

  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `variant_id, quantity,
       product_variants:variant_id ( id, color, size, price_override, stock, images,
         products:product_id ( id, slug, name, images, regular_price, sale_price ) )`
    )
    .eq("cart_id", cart.id)
    .returns<RawCartItemRow[]>();

  if (error || !data) return [];

  return data
    .filter((row) => row.product_variants && row.product_variants.products)
    .map((row) => {
      const v = row.product_variants!;
      const p = v.products!;
      const unitPrice =
        v.price_override ??
        (p.sale_price && p.sale_price > 0 && p.sale_price < p.regular_price ? p.sale_price : p.regular_price);
      return {
        productId: p.id,
        variantId: v.id,
        slug: p.slug,
        name: p.name,
        image: v.images?.[0] ?? p.images?.[0] ?? "/images/product-fallback.svg",
        color: v.color,
        size: v.size,
        unitPrice,
        quantity: row.quantity,
      } satisfies CartLine;
    });
}

/** The signed-in shopper's wishlisted product IDs. Empty for guests (their wishlist lives in localStorage only). */
export async function getServerWishlistProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: wishlist } = await supabase.from("wishlists").select("id").eq("user_id", user.id).maybeSingle();
  if (!wishlist) return [];

  const { data, error } = await supabase.from("wishlist_items").select("product_id").eq("wishlist_id", wishlist.id);
  if (error || !data) return [];
  return data.map((r) => r.product_id);
}

// ============================================================
// Account & Order Tracking (Phase 8)
// ============================================================

/** The signed-in customer's profile, or null for guests. Never exposes another user's row (RLS-owned). */
export async function getAccountProfile(): Promise<AccountProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, role, membership_tier, reward_points, account_status, created_at")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;

  return {
    fullName: data.full_name ?? "",
    phone: data.phone ?? "",
    email: user.email ?? "",
    role: data.role,
    membershipTier: data.membership_tier,
    rewardPoints: data.reward_points,
    accountStatus: data.account_status,
    createdAt: data.created_at,
  };
}

interface RawAccountOrderRow {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  order_items: { quantity: number }[] | null;
  payments: { payment_method: string; payment_status: string }[] | null;
}

/** The signed-in customer's own orders, most recent first. Empty for guests/signed-out visitors. */
export async function getAccountOrders(): Promise<AccountOrderSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, grand_total, created_at,
       order_items ( quantity ),
       payments ( payment_method, payment_status )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<RawAccountOrderRow[]>();

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: toUiOrderStatus(row.status),
    paymentMethod: (row.payments?.[0]?.payment_method.toUpperCase() ?? "COD") as AccountOrderSummary["paymentMethod"],
    paymentStatus: toUiPaymentStatus(row.payments?.[0]?.payment_status ?? "pending"),
    grandTotal: Number(row.grand_total),
    itemCount: row.order_items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
    createdAt: row.created_at,
  }));
}

interface RawOrderDetailRow {
  id: string;
  order_number: string;
  status: string;
  courier_name: string | null;
  tracking_number: string | null;
  delivery_zone: "inside_dhaka" | "outside_dhaka" | "express";
  guest_name: string | null;
  guest_phone: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  grand_total: number;
  shipping_address_snapshot: OrderTrackingDetail["address"];
  created_at: string;
  updated_at: string;
  order_items: {
    product_name: string;
    color: string;
    size: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
}

/** One of the signed-in customer's own orders, for /account/orders/[id]. Returns null if it isn't theirs. */
export async function getAccountOrderDetail(orderId: string): Promise<OrderTrackingDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, courier_name, tracking_number, delivery_zone,
       guest_name, guest_phone, subtotal, discount_amount, delivery_fee, grand_total,
       shipping_address_snapshot, created_at, updated_at,
       order_items ( product_name, color, size, unit_price, quantity, line_total )`
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle<RawOrderDetailRow>();

  if (error || !data) return null;
  return mapOrderDetail(data);
}

function mapOrderDetail(row: RawOrderDetailRow): OrderTrackingDetail {
  const address = row.shipping_address_snapshot;
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: toUiOrderStatus(row.status),
    courierName: row.courier_name,
    trackingNumber: row.tracking_number,
    deliveryZone: row.delivery_zone,
    customerName: address?.full_name ?? row.guest_name ?? "",
    customerPhone: address?.phone ?? row.guest_phone ?? "",
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    deliveryFee: Number(row.delivery_fee),
    grandTotal: Number(row.grand_total),
    address: address ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.order_items.map((i) => ({
      productName: i.product_name,
      color: i.color,
      size: i.size,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
    })),
  };
}

interface RawTrackOrderPayload {
  order: {
    id: string;
    order_number: string;
    status: string;
    courier_name: string | null;
    tracking_number: string | null;
    delivery_zone: "inside_dhaka" | "outside_dhaka" | "express";
    guest_name: string | null;
    guest_phone: string | null;
    subtotal: number;
    discount_amount: number;
    delivery_fee: number;
    grand_total: number;
    shipping_address: OrderTrackingDetail["address"];
    created_at: string;
    updated_at: string;
  };
  items: RawOrderDetailRow["order_items"];
}

/** Public order tracking by order number, for guests (phone or confirmation token) and signed-in owners. Never exposes another customer's order — enforced inside the `track_order` RPC (migration 013). */
export async function trackOrderPublic(input: {
  orderNumber: string;
  phone?: string;
  token?: string;
}): Promise<TrackOrderResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_order", {
    p_order_number: input.orderNumber.trim(),
    p_phone: input.phone?.trim() || null,
    p_confirmation_token: input.token?.trim() || null,
  });

  const payload = data as RawTrackOrderPayload | null;
  if (error || !payload?.order) {
    return { status: "not_found", message: "We couldn't find an order with those details." };
  }

  const { order: o, items } = payload;
  return {
    status: "found",
    order: mapOrderDetail({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      courier_name: o.courier_name,
      tracking_number: o.tracking_number,
      delivery_zone: o.delivery_zone,
      guest_name: o.guest_name,
      guest_phone: o.guest_phone,
      subtotal: o.subtotal,
      discount_amount: o.discount_amount,
      delivery_fee: o.delivery_fee,
      grand_total: o.grand_total,
      shipping_address_snapshot: o.shipping_address,
      created_at: o.created_at,
      updated_at: o.updated_at,
      order_items: items,
    }),
  };
}

/** The signed-in customer's saved addresses, default first. */
export async function getAddresses(): Promise<Address[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("shipping_addresses")
    .select("id, label, full_name, phone, division, district, area, full_address, delivery_note, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.full_name,
    phone: a.phone,
    division: a.division,
    district: a.district,
    area: a.area,
    fullAddress: a.full_address,
    deliveryNote: a.delivery_note ?? undefined,
    isDefault: a.is_default,
  }));
}

/** Delivered order items the customer hasn't already requested a return/exchange for. */
export async function getReturnEligibleItems(): Promise<ReturnEligibleItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `id, product_name, color, size, quantity,
       orders!inner ( id, order_number, status, user_id, updated_at ),
       returns ( id, status )`
    )
    .eq("orders.user_id", user.id)
    .eq("orders.status", "delivered");

  if (error || !data) return [];

  return data
    .filter((row) => {
      const existing = (row.returns as { status: string }[] | null) ?? [];
      // Eligible if there's no return yet, or every prior request was rejected
      // (matches the "one active request per item" rule in migration 013).
      return existing.every((r) => r.status === "rejected");
    })
    .map((row) => {
      const order = row.orders as unknown as { id: string; order_number: string; updated_at: string };
      return {
        orderItemId: row.id,
        orderId: order.id,
        orderNumber: order.order_number,
        productName: row.product_name,
        color: row.color,
        size: row.size,
        quantity: row.quantity,
        deliveredAt: order.updated_at,
      };
    });
}

interface RawReturnRow {
  id: string;
  reason: string;
  description: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  orders: { order_number: string } | null;
  order_items: { product_name: string; color: string; size: string } | null;
}

/** The signed-in customer's return/exchange requests, most recent first, with signed photo URLs (private bucket). */
export async function getUserReturns(): Promise<ReturnRequestSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("returns")
    .select(
      `id, reason, description, photo_url, status, created_at,
       orders:order_id ( order_number ),
       order_items:order_item_id ( product_name, color, size )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<RawReturnRow[]>();

  if (error || !data) return [];

  return Promise.all(
    data.map(async (row) => {
      let photoUrl: string | null = null;
      if (row.photo_url) {
        const { data: signed } = await supabase.storage.from("returns").createSignedUrl(row.photo_url, 3600);
        photoUrl = signed?.signedUrl ?? null;
      }
      return {
        id: row.id,
        orderNumber: row.orders?.order_number ?? "",
        productName: row.order_items?.product_name ?? "",
        color: row.order_items?.color ?? "",
        size: row.order_items?.size ?? "",
        reason: row.reason as ReturnRequestSummary["reason"],
        description: row.description,
        photoUrl,
        status: row.status as ReturnRequestSummary["status"],
        createdAt: row.created_at,
      };
    })
  );
}

interface RawMyReviewRow {
  id: string;
  rating: number;
  body: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  products: { id: string; slug: string; name: string; images: string[] | null } | null;
}

/** The signed-in customer's own reviews (approved and pending), most recent first. */
export async function getUserReviews(): Promise<MyReviewSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, body, is_verified_purchase, is_approved, created_at,
       products:product_id ( id, slug, name, images )`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<RawMyReviewRow[]>();

  if (error || !data) return [];

  return data
    .filter((row) => row.products)
    .map((row) => ({
      id: row.id,
      productId: row.products!.id,
      productSlug: row.products!.slug,
      productName: row.products!.name,
      productImage: row.products!.images?.[0] ?? null,
      rating: row.rating,
      body: row.body,
      isVerifiedPurchase: row.is_verified_purchase,
      isApproved: row.is_approved,
      createdAt: row.created_at,
    }));
}

const TIER_RANK = { bronze: 0, silver: 1, gold: 2, platinum: 3 } as const;

/** Active coupons the signed-in customer could use right now, with an eligibility check against their real tier/order history. Guests see none (a coupon can only be evaluated against a real account). */
export async function getAvailableCoupons(): Promise<AvailableCouponSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: coupons }, { data: profile }, { count: orderCount }] = await Promise.all([
    supabase
      .from("coupons")
      .select("code, type, value, min_order_amount, membership_tier_required, first_order_only, expires_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("membership_tier").eq("id", user.id).single(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "cancelled"),
  ]);

  if (!coupons) return [];
  const myTier = profile?.membership_tier ?? "bronze";

  return coupons.map((c) => {
    let eligible = true;
    let ineligibleReason: string | undefined;

    if (c.membership_tier_required && TIER_RANK[myTier as keyof typeof TIER_RANK] < TIER_RANK[c.membership_tier_required as keyof typeof TIER_RANK]) {
      eligible = false;
      ineligibleReason = `Requires ${c.membership_tier_required} tier or above`;
    } else if (c.first_order_only && (orderCount ?? 0) > 0) {
      eligible = false;
      ineligibleReason = "Valid on your first order only";
    }

    return {
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: Number(c.min_order_amount),
      membershipTierRequired: c.membership_tier_required,
      firstOrderOnly: c.first_order_only,
      expiresAt: c.expires_at,
      eligible,
      ineligibleReason,
    } satisfies AvailableCouponSummary;
  });
}

/** The signed-in customer's coupon redemption history. */
export async function getCouponUsageHistory(): Promise<CouponUsageSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("coupon_usage")
    .select("used_at, coupons:coupon_id ( code ), order_id")
    .eq("user_id", user.id)
    .order("used_at", { ascending: false });

  if (error || !data) return [];

  const orderIds = data.map((r) => r.order_id).filter((id): id is string => Boolean(id));
  const orderNumberById = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: orders } = await supabase.from("orders").select("id, order_number").in("id", orderIds);
    orders?.forEach((o) => orderNumberById.set(o.id, o.order_number));
  }

  return data.map((row) => ({
    code: (row.coupons as unknown as { code: string } | null)?.code ?? "",
    usedAt: row.used_at,
    orderNumber: row.order_id ? (orderNumberById.get(row.order_id) ?? null) : null,
  }));
}

/** The signed-in customer's notifications, most recent first. */
export async function getNotifications(): Promise<NotificationSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
  }));
}

/** The signed-in customer's membership tier, points balance, and real points history. */
export async function getRewardSummary(): Promise<RewardSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("membership_tier, reward_points").eq("id", user.id).single(),
    supabase
      .from("reward_transactions")
      .select("id, points, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!profile) return null;

  return {
    tier: profile.membership_tier,
    points: profile.reward_points,
    transactions: (transactions ?? []).map((t) => ({
      id: t.id,
      points: t.points,
      reason: t.reason,
      createdAt: t.created_at,
    })),
  };
}
