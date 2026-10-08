// Shared domain types for Glam Soles BD.
// These mirror the Supabase schema that Phase 2 will introduce.
// UI components are built against these types now so later phases
// only need to swap placeholder data for real Supabase queries.

export type ProductCategory = "women" | "men" | "kids" | "accessories";

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  sku: string;
  stock: number;
  priceOverride?: number;
  images?: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  category: ProductCategory;
  subcategory: string;
  brand?: string;
  description?: string;
  materials?: string;
  features?: string[];
  sizeFitNotes?: string;
  videoUrl?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number;
  colors: string[];
  images: string[];
  isNew?: boolean;
  inStock?: boolean;
  variants?: ProductVariant[];
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string | null;
  sizeFeedback: string | null;
  photoUrls: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus = "PENDING" | "COLLECTED" | "FAILED" | "REFUNDED";

export interface CartLine {
  productId: string;
  variantId: string;
  slug?: string;
  name: string;
  image: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
}

/**
 * Server-verified snapshot of a cart line, produced by revalidating the
 * client's variantId/quantity against live product/variant data. Never
 * trust a client-supplied price or stock figure — this is always the
 * authority used to render warnings and to gate checkout.
 */
export interface CartLineValidation {
  variantId: string;
  /** false when the variant/product no longer exists or isn't published */
  valid: boolean;
  productId: string;
  slug: string;
  name: string;
  image: string;
  color: string;
  size: string;
  currentPrice: number;
  currentStock: number;
  requestedQuantity: number;
  /** requestedQuantity clamped to currentStock (0 if unavailable) */
  adjustedQuantity: number;
  outOfStock: boolean;
}

export type CouponPreview =
  | {
      status: "valid";
      code: string;
      type: "percentage" | "fixed" | "free_delivery";
      discountAmount: number;
      message: string;
    }
  | {
      status: "invalid";
      message: string;
    };

/** Lightweight, real shipping fee data for cart-page display (final zone is chosen at checkout). */
export interface ShippingSettingsPreview {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  expressFee: number;
  expressEnabled: boolean;
  freeShippingThreshold: number | null;
}

export type DeliveryZone = "inside_dhaka" | "outside_dhaka" | "express";

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  email?: string;
  division: string;
  district: string;
  area: string;
  fullAddress: string;
  deliveryNote?: string;
}

export interface CheckoutItem {
  variantId: string;
  quantity: number;
}

export interface CheckoutResult {
  status: "success";
  orderId: string;
  orderNumber: string;
  confirmationToken: string;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  estimatedDelivery: string;
}

export type CheckoutActionResult =
  | CheckoutResult
  | { status: "error"; message: string; code?: "validation" | "unavailable" | "failed" };

// ============================================================
// Phase 8 — Order Tracking & Customer Account
// ============================================================

export interface OrderTrackingItem {
  productName: string;
  color: string;
  size: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderTrackingAddress {
  full_name: string;
  phone: string;
  email?: string | null;
  division: string;
  district: string;
  area: string;
  full_address: string;
  delivery_note?: string | null;
}

export interface OrderTrackingDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  courierName: string | null;
  trackingNumber: string | null;
  deliveryZone: DeliveryZone;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  address: OrderTrackingAddress | null;
  createdAt: string;
  updatedAt: string;
  items: OrderTrackingItem[];
}

export type TrackOrderResult =
  | { status: "found"; order: OrderTrackingDetail }
  | { status: "not_found"; message: string };

/** Account-facing order list row — lighter than the full tracking detail. */
export interface AccountOrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: "COD" | "BKASH" | "NAGAD" | "CARD";
  paymentStatus: PaymentStatus;
  grandTotal: number;
  itemCount: number;
  createdAt: string;
}

export type AddressLabel = "home" | "office" | "other";

export interface Address {
  id: string;
  label: AddressLabel;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  fullAddress: string;
  deliveryNote?: string;
  isDefault: boolean;
}

export interface AddressInput {
  label: AddressLabel;
  fullName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  fullAddress: string;
  deliveryNote?: string;
  isDefault: boolean;
}

export type AccountActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

export type ReturnReasonUi = "wrong_size" | "wrong_product" | "damaged" | "defective" | "other";
export type ReturnStatusUi = "requested" | "approved" | "rejected" | "exchanged" | "refunded" | "completed";

export interface ReturnEligibleItem {
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  deliveredAt: string;
}

export interface ReturnRequestSummary {
  id: string;
  orderNumber: string;
  productName: string;
  color: string;
  size: string;
  reason: ReturnReasonUi;
  description: string | null;
  photoUrl: string | null;
  status: ReturnStatusUi;
  createdAt: string;
}

export interface MyReviewSummary {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  productImage: string | null;
  rating: number;
  body: string | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface NotificationSummary {
  id: string;
  type:
    | "order"
    | "shipping"
    | "delivery"
    | "price_drop"
    | "back_in_stock"
    | "new_collection"
    | "coupon"
    | "reward"
    | "promotion";
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface RewardTransactionSummary {
  id: string;
  points: number;
  reason: string;
  createdAt: string;
}

export interface RewardSummary {
  tier: "bronze" | "silver" | "gold" | "platinum";
  points: number;
  transactions: RewardTransactionSummary[];
}

export interface AvailableCouponSummary {
  code: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  minOrderAmount: number;
  membershipTierRequired: "bronze" | "silver" | "gold" | "platinum" | null;
  firstOrderOnly: boolean;
  expiresAt: string | null;
  eligible: boolean;
  ineligibleReason?: string;
}

export interface CouponUsageSummary {
  code: string;
  usedAt: string;
  orderNumber: string | null;
}

export interface AccountProfile {
  fullName: string;
  phone: string;
  email: string;
  role: "customer" | "staff" | "manager" | "admin";
  membershipTier: "bronze" | "silver" | "gold" | "platinum";
  rewardPoints: number;
  accountStatus: "active" | "suspended";
  createdAt: string;
}
