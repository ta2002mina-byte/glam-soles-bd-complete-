// Types for the /admin panel (Phase 9). These map DB rows (types/database.ts)
// into shapes the admin UI works with directly.
import type { DbOrderStatus, DbPaymentMethod, DbPaymentStatus, MembershipTier, ReturnReason, ReturnStatus, UserRole } from "./database";

export interface AdminSession {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalOrders: number;
  newCustomers: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  lowStockCount: number;
  outOfStockCount: number;
  returnsPending: number;
  refundsCount: number;
}

export interface DashboardSeriesPoint {
  date: string;
  revenue: number;
  orders: number;
  newCustomers: number;
}

export type DateRangeKey = "today" | "7d" | "30d" | "3m" | "1y" | "custom";

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryName: string;
  brandName: string | null;
  regularPrice: number;
  salePrice: number | null;
  totalStock: number;
  variantCount: number;
  isActive: boolean;
  isPublished: boolean;
  primaryImage: string | null;
  updatedAt: string;
}

export interface AdminVariantInput {
  id?: string;
  color: string;
  size: string;
  sku: string;
  priceOverride: number | null;
  stock: number;
  lowStockThreshold: number;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string | null;
  description: string | null;
  materials: string | null;
  features: string[];
  sizeFitNotes: string | null;
  regularPrice: number;
  salePrice: number | null;
  costPrice: number | null;
  weightGrams: number | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  images: string[];
  videoUrl: string | null;
  isActive: boolean;
  isPublished: boolean;
  variants: AdminVariantInput[];
}

export interface AdminProductInput {
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string | null;
  description: string;
  materials: string;
  features: string[];
  sizeFitNotes: string;
  regularPrice: number;
  salePrice: number | null;
  costPrice: number | null;
  weightGrams: number | null;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  images: string[];
  videoUrl: string;
  isActive: boolean;
  isPublished: boolean;
}

export interface AdminCategoryOption {
  id: string;
  name: string;
  parentName: string | null;
}

export interface AdminBrandOption {
  id: string;
  name: string;
}

export interface AdminInventoryRow {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  lowStockThreshold: number;
  sold: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  itemCount: number;
  grandTotal: number;
  paymentMethod: DbPaymentMethod;
  paymentStatus: DbPaymentStatus;
  status: DbOrderStatus;
  createdAt: string;
}

export interface AdminOrderItemRow {
  id: string;
  productName: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: DbOrderStatus;
  createdAt: string;
  userId: string | null;
  customerName: string;
  phone: string;
  email: string | null;
  address: {
    division: string;
    district: string;
    area: string;
    fullAddress: string;
    deliveryNote: string | null;
  } | null;
  deliveryZone: string;
  courierName: string | null;
  trackingNumber: string | null;
  items: AdminOrderItemRow[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  payment: {
    id: string;
    method: DbPaymentMethod;
    status: DbPaymentStatus;
    amount: number;
    paidAt: string | null;
  } | null;
}

export interface AdminCustomerListItem {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  membershipTier: MembershipTier;
  rewardPoints: number;
  orderCount: number;
  totalSpending: number;
  lastOrderAt: string | null;
  accountStatus: "active" | "suspended";
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerListItem {
  orders: {
    id: string;
    orderNumber: string;
    status: DbOrderStatus;
    grandTotal: number;
    createdAt: string;
  }[];
}

export type AdminActionResult =
  | { status: "success"; message?: string }
  | { status: "error"; message: string };

// ============================================================
// Phase 10 — CMS, Returns, Shipping, Analytics
// (ported from the separately-built Phase 10 branch; kept as its own
// section since it was authored independently of the types above)
// ============================================================

export interface AdminReturnRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  color: string;
  size: string;
  reason: ReturnReason;
  description: string | null;
  photoUrl: string | null;
  status: ReturnStatus;
  adminNote: string | null;
  createdAt: string;
}

export interface AdminSessionProfile {
  id: string;
  fullName: string | null;
  role: UserRole;
}

/**
 * Result shape for the Phase 10 (CMS/returns/shipping) server actions.
 * Kept distinct from `AdminActionResult` above (Phase 9 uses
 * `{status:"success"}`, Phase 10 uses `{status:"ok"}`) rather than forcing
 * one shape onto code that already checks the other — both are backed by
 * the same underlying guarantees.
 */
export type CmsActionResult = { status: "ok" } | { status: "error"; message: string };

export interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export interface TestimonialInput {
  id?: string;
  customerName: string;
  customerRole: string;
  rating: number;
  quote: string;
  photoUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BannerInput {
  id?: string;
  placement: "hero" | "category" | "promo" | "homepage_section" | "announcement";
  title: string;
  subtitle: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  ctaText: string;
  ctaLink: string;
  startsAt: string;
  endsAt: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ShippingSettingsInput {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  expressFee: number;
  expressEnabled: boolean;
  freeShippingThreshold: number | null;
}

export interface HomepageSectionRow {
  id: string;
  sectionKey: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface FeaturedProductRow {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  cancellationRate: number;
  returnRate: number;
  codCollectionRate: number;
  dailySales: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; unitsSold: number; revenue: number }[];
  topCategories: { name: string; unitsSold: number; revenue: number }[];
}
