// Types that mirror the actual Supabase database schema (supabase/migrations/*.sql).
// Use these for any direct Supabase query / RPC call.
// The UI-facing types in types/index.ts stay simpler and are mapped from these.

export type UserRole = "customer" | "staff" | "manager" | "admin";

export type DbOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type DbPaymentMethod = "cod" | "bkash" | "nagad" | "card";
export type DbPaymentStatus = "pending" | "collected" | "failed" | "refunded";
export type MembershipTier = "bronze" | "silver" | "gold" | "platinum";
export type ReturnReason = "wrong_size" | "wrong_product" | "damaged" | "defective" | "other";
export type ReturnStatus = "requested" | "approved" | "rejected" | "exchanged" | "refunded" | "completed";
export type CouponType = "percentage" | "fixed" | "free_delivery";

export interface DbProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  membership_tier: MembershipTier;
  reward_points: number;
  account_status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  banner_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  brand_id: string | null;
  description: string | null;
  materials: string | null;
  features: string[] | null;
  size_fit_notes: string | null;
  regular_price: number;
  sale_price: number | null;
  cost_price: number | null;
  tags: string[] | null;
  images: string[];
  video_url: string | null;
  is_active: boolean;
  is_published: boolean;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  color: string;
  size: string;
  sku: string;
  price_override: number | null;
  stock: number;
  low_stock_threshold: number;
  images: string[] | null;
}

export interface DbReview {
  id: string;
  product_id: string;
  user_id: string;
  order_item_id: string | null;
  rating: number;
  body: string | null;
  size_feedback: string | null;
  photo_urls: string[] | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  shipping_address_id: string | null;
  status: DbOrderStatus;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  coupon_id: string | null;
  grand_total: number;
  delivery_zone: "inside_dhaka" | "outside_dhaka" | "express";
  delivery_note: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbShippingAddress {
  id: string;
  user_id: string;
  label: "home" | "office" | "other";
  full_name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  full_address: string;
  delivery_note: string | null;
  is_default: boolean;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
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
  is_read: boolean;
  created_at: string;
}

export interface DbReturn {
  id: string;
  order_id: string;
  order_item_id: string;
  user_id: string;
  reason: ReturnReason;
  description: string | null;
  photo_url: string | null;
  status: ReturnStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRewardTransaction {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  order_id: string | null;
  created_at: string;
}

export interface DbCouponUsage {
  id: string;
  coupon_id: string;
  user_id: string | null;
  order_id: string | null;
  used_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  color: string;
  size: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface DbPayment {
  id: string;
  order_id: string;
  payment_method: DbPaymentMethod;
  payment_status: DbPaymentStatus;
  amount: number;
  currency: string;
  paid_at: string | null;
}

/**
 * Mirrors the `placement` check constraint on `banners`
 * (migrations/004, extended by migrations/010 for 'announcement').
 */
export type BannerPlacement = "hero" | "category" | "promo" | "homepage_section" | "announcement";

export interface DbBanner {
  id: string;
  placement: BannerPlacement;
  title: string | null;
  subtitle: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order_amount: number;
  applies_to_category_id: string | null;
  membership_tier_required: MembershipTier | null;
  first_order_only: boolean;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface DbShippingSettings {
  id: number;
  inside_dhaka_fee: number;
  outside_dhaka_fee: number;
  express_fee: number;
  free_shipping_threshold: number | null;
  express_enabled: boolean;
}

// ---- Phase 10: Homepage CMS ----
export interface DbTestimonial {
  id: string;
  customer_name: string;
  customer_role: string | null;
  rating: number;
  quote: string;
  photo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbFeaturedProduct {
  id: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbHomepageSection {
  id: string;
  section_key: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

/**
 * Params for the `create_order` RPC — the ONLY supported way to place an
 * order. Never insert into `orders`/`order_items` directly from the client;
 * price, stock and totals are always recalculated server-side inside this
 * function (see supabase/migrations/006_secure_order_creation.sql).
 */
export interface CreateOrderParams {
  p_user_id: string | null;
  p_shipping_address_id: string | null;
  p_items: { variant_id: string; quantity: number }[];
  p_coupon_code?: string | null;
  p_delivery_zone?: "inside_dhaka" | "outside_dhaka" | "express";
  p_idempotency_key: string;
  p_guest_name?: string | null;
  p_guest_phone?: string | null;
  p_guest_email?: string | null;
}
