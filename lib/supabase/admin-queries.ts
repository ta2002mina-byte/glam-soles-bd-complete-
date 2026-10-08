import { createClient } from "@/lib/supabase/server";
import type {
  AdminReturnRow,
  AnalyticsSummary,
  FeaturedProductRow,
  HomepageSectionRow,
} from "@/types/admin";
import type {
  DbBanner,
  DbFeaturedProduct,
  DbHomepageSection,
  DbShippingSettings,
  DbTestimonial,
  ReturnStatus,
} from "@/types/database";

// ============================================================
// Returns & Exchanges
// ============================================================

interface RawReturnRow {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: AdminReturnRow["reason"];
  description: string | null;
  photo_url: string | null;
  status: ReturnStatus;
  admin_note: string | null;
  created_at: string;
  orders: { order_number: string } | null;
  order_items: { product_name: string; color: string; size: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
}

/** All return/exchange requests, newest first. Requires staff+ (enforced again by RLS). */
export async function getReturnsForAdmin(statusFilter?: ReturnStatus): Promise<AdminReturnRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("returns")
    .select(
      `id, order_id, order_item_id, user_id, reason, description, photo_url, status, admin_note, created_at,
       orders:order_id ( order_number ),
       order_items:order_item_id ( product_name, color, size ),
       profiles:user_id ( full_name, phone )`
    )
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error } = await query.returns<RawReturnRow[]>();
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    customerName: row.profiles?.full_name ?? "Customer",
    customerPhone: row.profiles?.phone ?? "—",
    productName: row.order_items?.product_name ?? "—",
    color: row.order_items?.color ?? "—",
    size: row.order_items?.size ?? "—",
    reason: row.reason,
    description: row.description,
    photoUrl: row.photo_url,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
  }));
}

// ============================================================
// Homepage CMS: banners, testimonials, featured products, sections
// ============================================================

export async function getBannersForAdmin(): Promise<DbBanner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("placement")
    .order("sort_order")
    .returns<DbBanner[]>();
  return error || !data ? [] : data;
}

export async function getTestimonialsForAdmin(): Promise<DbTestimonial[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order")
    .returns<DbTestimonial[]>();
  return error || !data ? [] : data;
}

export async function getHomepageSectionsForAdmin(): Promise<HomepageSectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homepage_sections")
    .select("*")
    .order("sort_order")
    .returns<DbHomepageSection[]>();

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    sectionKey: r.section_key,
    label: r.label,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  }));
}

interface RawFeaturedProductRow extends DbFeaturedProduct {
  products: { name: string; images: string[] | null } | null;
}

export async function getFeaturedProductsForAdmin(): Promise<FeaturedProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("featured_products")
    .select("id, product_id, sort_order, is_active, created_at, products:product_id ( name, images )")
    .order("sort_order")
    .returns<RawFeaturedProductRow[]>();

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.products?.name ?? "—",
    productImage: r.products?.images?.[0] ?? "/images/product-fallback.svg",
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }));
}

// ============================================================
// Shipping settings (raw, for the admin edit form)
// ============================================================

export async function getShippingSettingsForAdmin(): Promise<DbShippingSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipping_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const row = data as DbShippingSettings | null;

  return (
    row ?? {
      id: 1,
      inside_dhaka_fee: 60,
      outside_dhaka_fee: 120,
      express_fee: 150,
      free_shipping_threshold: null,
      express_enabled: false,
    }
  );
}

// ============================================================
// Analytics — every figure below is computed from real orders/payments
// rows for the requested date range. No fabricated metrics.
// ============================================================

interface RawAnalyticsOrder {
  id: string;
  status: string;
  grand_total: number;
  created_at: string;
  payments: { payment_status: string }[] | null;
}

interface RawAnalyticsOrderItem {
  order_id: string;
  product_name: string;
  quantity: number;
  line_total: number;
  product_variants: {
    products: { category_id: string; categories: { name: string } | null } | null;
  } | null;
}

export async function getAnalyticsSummary(fromISO: string, toISO: string): Promise<AnalyticsSummary> {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, grand_total, created_at, payments ( payment_status )")
    .gte("created_at", fromISO)
    .lte("created_at", toISO)
    .returns<RawAnalyticsOrder[]>();

  const rows = orders ?? [];
  const nonCancelled = rows.filter((o) => o.status !== "cancelled");
  const totalRevenue = nonCancelled.reduce((sum, o) => sum + Number(o.grand_total), 0);
  const totalOrders = rows.length;
  const averageOrderValue = nonCancelled.length > 0 ? totalRevenue / nonCancelled.length : 0;
  const cancellationRate = totalOrders > 0 ? rows.filter((o) => o.status === "cancelled").length / totalOrders : 0;
  const returnRate = totalOrders > 0 ? rows.filter((o) => o.status === "returned").length / totalOrders : 0;
  const codOrders = rows.filter((o) => (o.payments ?? []).some((p) => p.payment_status !== undefined));
  const codCollected = rows.filter((o) => (o.payments ?? []).some((p) => p.payment_status === "collected"));
  const codCollectionRate = codOrders.length > 0 ? codCollected.length / codOrders.length : 0;

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of nonCancelled) {
    const day = o.created_at.slice(0, 10);
    const entry = dailyMap.get(day) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.grand_total);
    entry.orders += 1;
    dailyMap.set(day, entry);
  }
  const dailySales = Array.from(dailyMap, ([date, v]) => ({ date, ...v })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const orderIds = rows.map((o) => o.id);
  let topProducts: AnalyticsSummary["topProducts"] = [];
  let topCategories: AnalyticsSummary["topCategories"] = [];

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select(
        `order_id, product_name, quantity, line_total,
         product_variants:variant_id ( products:product_id ( category_id, categories:category_id ( name ) ) )`
      )
      .in("order_id", orderIds)
      .returns<RawAnalyticsOrderItem[]>();

    const cancelledIds = new Set(rows.filter((o) => o.status === "cancelled").map((o) => o.id));
    const sellable = (items ?? []).filter((i) => !cancelledIds.has(i.order_id));

    const byProduct = new Map<string, { unitsSold: number; revenue: number }>();
    const byCategory = new Map<string, { unitsSold: number; revenue: number }>();
    for (const item of sellable) {
      const p = byProduct.get(item.product_name) ?? { unitsSold: 0, revenue: 0 };
      p.unitsSold += item.quantity;
      p.revenue += Number(item.line_total);
      byProduct.set(item.product_name, p);

      const categoryName = item.product_variants?.products?.categories?.name ?? "Uncategorized";
      const c = byCategory.get(categoryName) ?? { unitsSold: 0, revenue: 0 };
      c.unitsSold += item.quantity;
      c.revenue += Number(item.line_total);
      byCategory.set(categoryName, c);
    }

    topProducts = Array.from(byProduct, ([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    topCategories = Array.from(byCategory, ([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
  }

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue,
    cancellationRate,
    returnRate,
    codCollectionRate,
    dailySales,
    topProducts,
    topCategories,
  };
}
