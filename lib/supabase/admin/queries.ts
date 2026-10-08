// Server-only admin data layer. Every function here runs against the
// authenticated, cookie-bound Supabase client (lib/supabase/server) so
// RLS (migration 005) and the Phase 9 guard triggers (migration 013)
// are always the real authority — this file never uses a service-role
// key. Callers (Server Components / Server Actions under app/admin)
// are additionally gated by getAdminSession()/roleAtLeast().
import { createClient } from "@/lib/supabase/server";
import type {
  AdminBrandOption,
  AdminCategoryOption,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminInventoryRow,
  AdminOrderDetail,
  AdminOrderListItem,
  AdminProductDetail,
  AdminProductListItem,
  DashboardSeriesPoint,
  DashboardSummary,
} from "@/types/admin";
import type { DbOrderStatus, DbPaymentMethod, DbPaymentStatus, UserRole } from "@/types/database";

// ============================================================
// Dashboard
// ============================================================

export async function getDashboardSummary(from: Date, to: Date): Promise<DashboardSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_summary", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    totalRevenue: Number(row.total_revenue ?? 0),
    totalOrders: Number(row.total_orders ?? 0),
    newCustomers: Number(row.new_customers ?? 0),
    totalCustomers: Number(row.total_customers ?? 0),
    totalProducts: Number(row.total_products ?? 0),
    pendingOrders: Number(row.pending_orders ?? 0),
    lowStockCount: Number(row.low_stock_count ?? 0),
    outOfStockCount: Number(row.out_of_stock_count ?? 0),
    returnsPending: Number(row.returns_pending ?? 0),
    refundsCount: Number(row.refunds_count ?? 0),
  };
}

export async function getDashboardSeries(from: Date, to: Date): Promise<DashboardSeriesPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_series", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    date: String(row.bucket_date),
    revenue: Number(row.revenue ?? 0),
    orders: Number(row.orders_count ?? 0),
    newCustomers: Number(row.new_customers ?? 0),
  }));
}

// ============================================================
// Categories / Brands (form options)
// ============================================================

export async function getAdminCategoryOptions(): Promise<AdminCategoryOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, parent:parent_id(name)")
    .order("sort_order");

  return (data ?? []).map((row) => {
    const parent = row.parent as { name: string } | { name: string }[] | null;
    const parentName = Array.isArray(parent) ? parent[0]?.name ?? null : parent?.name ?? null;
    return { id: row.id as string, name: row.name as string, parentName };
  });
}

export async function getAdminBrandOptions(): Promise<AdminBrandOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("brands").select("id, name").order("name");
  return (data ?? []) as AdminBrandOption[];
}

// ============================================================
// Products
// ============================================================

interface ProductListParams {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminProducts(
  params: ProductListParams = {}
): Promise<{ items: AdminProductListItem[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, sku, regular_price, sale_price, images, is_active, is_published, updated_at, categories:category_id(name), brands:brand_id(name), product_variants(stock)",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
  }
  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  const { data, count, error } = await query;
  if (error || !data) return { items: [], total: 0 };

  const items: AdminProductListItem[] = data.map((row) => {
    const category = row.categories as { name: string } | { name: string }[] | null;
    const brand = row.brands as { name: string } | { name: string }[] | null;
    const variants = (row.product_variants ?? []) as { stock: number }[];
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      sku: row.sku as string,
      categoryName: Array.isArray(category) ? category[0]?.name ?? "—" : category?.name ?? "—",
      brandName: Array.isArray(brand) ? brand[0]?.name ?? null : brand?.name ?? null,
      regularPrice: Number(row.regular_price),
      salePrice: row.sale_price === null ? null : Number(row.sale_price),
      totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
      variantCount: variants.length,
      isActive: row.is_active as boolean,
      isPublished: row.is_published as boolean,
      primaryImage: ((row.images as string[] | null) ?? [])[0] ?? null,
      updatedAt: row.updated_at as string,
    };
  });

  return { items, total: count ?? items.length };
}

export async function getAdminProductById(id: string): Promise<AdminProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, sku, category_id, brand_id, description, materials, features, size_fit_notes, regular_price, sale_price, cost_price, weight_grams, tags, seo_title, seo_description, seo_keywords, images, video_url, is_active, is_published, product_variants(id, color, size, sku, price_override, stock, low_stock_threshold)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const variants = (data.product_variants ?? []) as {
    id: string;
    color: string;
    size: string;
    sku: string;
    price_override: number | null;
    stock: number;
    low_stock_threshold: number;
  }[];

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    categoryId: data.category_id,
    brandId: data.brand_id,
    description: data.description,
    materials: data.materials,
    features: data.features ?? [],
    sizeFitNotes: data.size_fit_notes,
    regularPrice: Number(data.regular_price),
    salePrice: data.sale_price === null ? null : Number(data.sale_price),
    costPrice: data.cost_price === null ? null : Number(data.cost_price),
    weightGrams: data.weight_grams,
    tags: data.tags ?? [],
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    seoKeywords: data.seo_keywords ?? [],
    images: data.images ?? [],
    videoUrl: data.video_url,
    isActive: data.is_active,
    isPublished: data.is_published,
    variants: variants
      .sort((a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size))
      .map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        sku: v.sku,
        priceOverride: v.price_override === null ? null : Number(v.price_override),
        stock: v.stock,
        lowStockThreshold: v.low_stock_threshold,
      })),
  };
}

// ============================================================
// Inventory
// ============================================================

export async function getAdminInventory(params: { search?: string; lowStockOnly?: boolean } = {}): Promise<
  AdminInventoryRow[]
> {
  const supabase = await createClient();

  let query = supabase
    .from("product_variants")
    .select(
      "id, color, size, sku, stock, low_stock_threshold, products:product_id(id, name, slug)"
    )
    .order("stock", { ascending: true });

  if (params.search) {
    query = query.or(`sku.ilike.%${params.search}%,color.ilike.%${params.search}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Sold counts: sum of order_items quantity for non-cancelled orders,
  // computed in one grouped query rather than N+1 per variant.
  const variantIds = data.map((row) => row.id as string);
  const soldByVariant = new Map<string, number>();
  if (variantIds.length > 0) {
    const { data: soldRows } = await supabase
      .from("order_items")
      .select("variant_id, quantity, orders:order_id(status)")
      .in("variant_id", variantIds);

    for (const row of soldRows ?? []) {
      const orderRef = row.orders as { status: DbOrderStatus } | { status: DbOrderStatus }[] | null;
      const status = Array.isArray(orderRef) ? orderRef[0]?.status : orderRef?.status;
      if (status === "cancelled") continue;
      const key = row.variant_id as string;
      soldByVariant.set(key, (soldByVariant.get(key) ?? 0) + (row.quantity as number));
    }
  }

  const rows: AdminInventoryRow[] = data.map((row) => {
    const product = row.products as { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
    const p = Array.isArray(product) ? product[0] : product;
    const stock = row.stock as number;
    const threshold = row.low_stock_threshold as number;
    const status: AdminInventoryRow["status"] =
      stock === 0 ? "out_of_stock" : stock <= threshold ? "low_stock" : "in_stock";

    return {
      variantId: row.id as string,
      productId: p?.id ?? "",
      productName: p?.name ?? "—",
      productSlug: p?.slug ?? "",
      sku: row.sku as string,
      color: row.color as string,
      size: row.size as string,
      stock,
      lowStockThreshold: threshold,
      sold: soldByVariant.get(row.id as string) ?? 0,
      status,
    };
  });

  return params.lowStockOnly ? rows.filter((r) => r.status !== "in_stock") : rows;
}

// ============================================================
// Orders
// ============================================================

interface OrderListParams {
  status?: DbOrderStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminOrders(
  params: OrderListParams = {}
): Promise<{ items: AdminOrderListItem[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, guest_name, guest_phone, status, grand_total, created_at, shipping_address_snapshot, profiles:user_id(full_name, phone), order_items(id), payments(payment_method, payment_status)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);
  if (params.search) {
    query = query.or(`order_number.ilike.%${params.search}%,guest_phone.ilike.%${params.search}%,guest_name.ilike.%${params.search}%`);
  }

  const { data, count, error } = await query;
  if (error || !data) return { items: [], total: 0 };

  const items: AdminOrderListItem[] = data.map((row) => {
    const profile = row.profiles as { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const payments = (row.payments ?? []) as { payment_method: AdminOrderListItem["paymentMethod"]; payment_status: DbPaymentStatus }[];
    const payment = payments[0];
    const snapshot = row.shipping_address_snapshot as { full_name?: string; phone?: string } | null;

    return {
      id: row.id as string,
      orderNumber: row.order_number as string,
      customerName: p?.full_name || row.guest_name || snapshot?.full_name || "Guest",
      phone: p?.phone || (row.guest_phone as string | null) || snapshot?.phone || "—",
      itemCount: ((row.order_items ?? []) as unknown[]).length,
      grandTotal: Number(row.grand_total),
      paymentMethod: payment?.payment_method ?? "cod",
      paymentStatus: payment?.payment_status ?? "pending",
      status: row.status as DbOrderStatus,
      createdAt: row.created_at as string,
    };
  });

  return { items, total: count ?? items.length };
}

export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, status, created_at, user_id, guest_name, guest_phone, guest_email,
       delivery_zone, delivery_note, courier_name, tracking_number, shipping_address_snapshot, subtotal, discount_amount, delivery_fee, grand_total,
       profiles:user_id(full_name, phone),
       shipping_addresses:shipping_address_id(division, district, area, full_address, delivery_note),
       order_items(id, product_name, color, size, unit_price, quantity, line_total),
       payments(id, payment_method, payment_status, amount, paid_at)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data.profiles as { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
  const p = Array.isArray(profile) ? profile[0] : profile;
  const savedAddress = data.shipping_addresses as
    | { division: string; district: string; area: string; full_address: string; delivery_note: string | null }
    | { division: string; district: string; area: string; full_address: string; delivery_note: string | null }[]
    | null;
  const addr = Array.isArray(savedAddress) ? savedAddress[0] : savedAddress;
  const snapshot = data.shipping_address_snapshot as
    | { division?: string; district?: string; area?: string; full_address?: string; full_name?: string; phone?: string }
    | null;
  const payments = (data.payments ?? []) as {
    id: string;
    payment_method: DbPaymentMethod;
    payment_status: DbPaymentStatus;
    amount: number;
    paid_at: string | null;
  }[];
  const payment = payments[0];

  return {
    id: data.id,
    orderNumber: data.order_number,
    status: data.status,
    createdAt: data.created_at,
    userId: data.user_id,
    customerName: p?.full_name || data.guest_name || snapshot?.full_name || "Guest",
    phone: p?.phone || data.guest_phone || snapshot?.phone || "—",
    email: data.guest_email,
    address: addr
      ? { division: addr.division, district: addr.district, area: addr.area, fullAddress: addr.full_address, deliveryNote: addr.delivery_note }
      : snapshot
        ? {
            division: snapshot.division ?? "—",
            district: snapshot.district ?? "—",
            area: snapshot.area ?? "—",
            fullAddress: snapshot.full_address ?? "—",
            deliveryNote: data.delivery_note,
          }
        : null,
    deliveryZone: data.delivery_zone,
    courierName: data.courier_name,
    trackingNumber: data.tracking_number,
    items: (data.order_items ?? []).map((it: { id: string; product_name: string; color: string; size: string; unit_price: number; quantity: number; line_total: number }) => ({
      id: it.id,
      productName: it.product_name,
      color: it.color,
      size: it.size,
      unitPrice: Number(it.unit_price),
      quantity: it.quantity,
      lineTotal: Number(it.line_total),
    })),
    subtotal: Number(data.subtotal),
    discountAmount: Number(data.discount_amount),
    deliveryFee: Number(data.delivery_fee),
    grandTotal: Number(data.grand_total),
    payment: payment
      ? { id: payment.id, method: payment.payment_method, status: payment.payment_status, amount: Number(payment.amount), paidAt: payment.paid_at }
      : null,
  };
}

// ============================================================
// Customers
// ============================================================

interface CustomerListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminCustomers(
  params: CustomerListParams = {}
): Promise<{ items: AdminCustomerListItem[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, role, membership_tier, reward_points, account_status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.search) {
    query = query.or(`full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
  }

  const { data, count, error } = await query;
  if (error || !data) return { items: [], total: 0 };

  const ids = data.map((row) => row.id as string);
  const orderStats = new Map<string, { count: number; total: number; lastOrderAt: string | null }>();

  if (ids.length > 0) {
    const { data: orderRows } = await supabase
      .from("orders")
      .select("user_id, grand_total, created_at, status")
      .in("user_id", ids);

    for (const row of orderRows ?? []) {
      if (row.status === "cancelled") continue;
      const key = row.user_id as string;
      const existing = orderStats.get(key) ?? { count: 0, total: 0, lastOrderAt: null as string | null };
      existing.count += 1;
      existing.total += Number(row.grand_total);
      if (!existing.lastOrderAt || row.created_at > existing.lastOrderAt) existing.lastOrderAt = row.created_at as string;
      orderStats.set(key, existing);
    }
  }

  const items: AdminCustomerListItem[] = data.map((row) => {
    const stats = orderStats.get(row.id as string);
    return {
      id: row.id as string,
      fullName: row.full_name,
      phone: row.phone,
      email: null,
      role: row.role as UserRole,
      membershipTier: row.membership_tier,
      rewardPoints: row.reward_points,
      orderCount: stats?.count ?? 0,
      totalSpending: stats?.total ?? 0,
      lastOrderAt: stats?.lastOrderAt ?? null,
      accountStatus: row.account_status,
      createdAt: row.created_at as string,
    };
  });

  return { items, total: count ?? items.length };
}

export async function getAdminCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, membership_tier, reward_points, account_status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, grand_total, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const nonCancelled = (orders ?? []).filter((o) => o.status !== "cancelled");

  return {
    id: profile.id,
    fullName: profile.full_name,
    phone: profile.phone,
    email: null,
    role: profile.role,
    membershipTier: profile.membership_tier,
    rewardPoints: profile.reward_points,
    orderCount: nonCancelled.length,
    totalSpending: nonCancelled.reduce((sum, o) => sum + Number(o.grand_total), 0),
    lastOrderAt: nonCancelled[0]?.created_at ?? null,
    accountStatus: profile.account_status,
    createdAt: profile.created_at,
    orders: (orders ?? []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      grandTotal: Number(o.grand_total),
      createdAt: o.created_at,
    })),
  };
}
