-- ============================================================
-- Glam Soles BD — Migration 005
-- Row Level Security (RLS) — enforced at the database level,
-- not just hidden in the frontend.
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- ---------- Helper: is the current user staff/manager/admin? ----------
create or replace function is_staff_or_above()
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('staff', 'manager', 'admin')
  );
$$;

create or replace function is_manager_or_above()
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('manager', 'admin')
  );
$$;

create or replace function is_admin()
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
alter table profiles enable row level security;

create policy "profiles_select_own_or_staff" on profiles
  for select using (id = auth.uid() or is_staff_or_above());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
  -- customers can update their own row but never change their own role

create policy "profiles_manager_update_role" on profiles
  for update using (is_manager_or_above());

-- ============================================================
-- CATALOG (public read for published content)
-- ============================================================
alter table categories enable row level security;
alter table brands enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;

create policy "categories_public_read" on categories for select using (is_active = true or is_staff_or_above());
create policy "categories_manager_write" on categories for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "brands_public_read" on brands for select using (true);
create policy "brands_manager_write" on brands for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "products_public_read_published" on products
  for select using (is_published = true or is_staff_or_above());

create policy "products_manager_write" on products
  for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "variants_public_read" on product_variants
  for select using (
    exists (select 1 from products p where p.id = product_id and (p.is_published = true or is_staff_or_above()))
  );

create policy "variants_manager_write" on product_variants
  for all using (is_manager_or_above()) with check (is_manager_or_above());

-- ============================================================
-- SHIPPING ADDRESSES — customers manage only their own
-- ============================================================
alter table shipping_addresses enable row level security;

create policy "addresses_owner_all" on shipping_addresses
  for all using (user_id = auth.uid() or is_staff_or_above())
  with check (user_id = auth.uid());

-- ============================================================
-- CART / CART ITEMS — owner only (guest carts handled via guest_token
-- checked in server-side code, not directly exposed to anon RLS)
-- ============================================================
alter table carts enable row level security;
alter table cart_items enable row level security;

create policy "carts_owner_all" on carts
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cart_items_owner_all" on cart_items
  for all using (
    exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ============================================================
-- WISHLIST — owner only
-- ============================================================
alter table wishlists enable row level security;
alter table wishlist_items enable row level security;

create policy "wishlists_owner_all" on wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "wishlist_items_owner_all" on wishlist_items
  for all using (
    exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  )
  with check (
    exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  );

-- ============================================================
-- ORDERS / ORDER ITEMS — customers see only their own; staff see all
-- ============================================================
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "orders_owner_or_staff_select" on orders
  for select using (user_id = auth.uid() or is_staff_or_above());

-- Orders are created exclusively through a security-definer RPC
-- (see migration 006), never via direct client insert — customers
-- cannot set their own total, status or payment_status this way.
create policy "orders_no_direct_client_write" on orders
  for insert with check (false);

create policy "orders_staff_update" on orders
  for update using (is_staff_or_above());

create policy "order_items_owner_or_staff_select" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_above()))
  );

-- ============================================================
-- PAYMENTS — never customer-writable; staff can mark COD collected
-- ============================================================
alter table payments enable row level security;

create policy "payments_owner_or_staff_select" on payments
  for select using (
    exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff_or_above()))
  );

create policy "payments_staff_update" on payments
  for update using (is_staff_or_above());

create policy "payments_no_direct_client_insert" on payments
  for insert with check (false);

-- ============================================================
-- COUPONS — public can read active coupons (to validate codes);
-- only manager+ can write
-- ============================================================
alter table coupons enable row level security;
alter table coupon_usage enable row level security;

create policy "coupons_public_read_active" on coupons
  for select using (is_active = true or is_manager_or_above());

create policy "coupons_manager_write" on coupons
  for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "coupon_usage_owner_or_staff_select" on coupon_usage
  for select using (user_id = auth.uid() or is_staff_or_above());

-- ============================================================
-- REVIEWS — public reads approved only; customers manage own eligible reviews
-- ============================================================
alter table reviews enable row level security;

create policy "reviews_public_read_approved" on reviews
  for select using (is_approved = true or user_id = auth.uid() or is_staff_or_above());

create policy "reviews_owner_insert" on reviews
  for insert with check (user_id = auth.uid());

create policy "reviews_owner_update_own_unapproved" on reviews
  for update using (user_id = auth.uid() and is_approved = false);

create policy "reviews_staff_moderate" on reviews
  for update using (is_staff_or_above());

-- ============================================================
-- REWARDS — owner read only; writes happen via security-definer function
-- ============================================================
alter table reward_transactions enable row level security;

create policy "reward_tx_owner_or_staff_select" on reward_transactions
  for select using (user_id = auth.uid() or is_staff_or_above());

-- ============================================================
-- NOTIFICATIONS — owner only
-- ============================================================
alter table notifications enable row level security;

create policy "notifications_owner_select" on notifications
  for select using (user_id = auth.uid());

create policy "notifications_owner_update_read_state" on notifications
  for update using (user_id = auth.uid());

-- ============================================================
-- RETURNS / EXCHANGES — owner + staff
-- ============================================================
alter table returns enable row level security;

create policy "returns_owner_or_staff_select" on returns
  for select using (user_id = auth.uid() or is_staff_or_above());

create policy "returns_owner_insert" on returns
  for insert with check (user_id = auth.uid());

create policy "returns_staff_update" on returns
  for update using (is_staff_or_above());

-- ============================================================
-- CMS: banners, promotions — public read active, manager+ write
-- ============================================================
alter table banners enable row level security;
alter table promotions enable row level security;

create policy "banners_public_read_active" on banners
  for select using (is_active = true or is_manager_or_above());

create policy "banners_manager_write" on banners
  for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "promotions_public_read_active" on promotions
  for select using (is_active = true or is_manager_or_above());

create policy "promotions_manager_write" on promotions
  for all using (is_manager_or_above()) with check (is_manager_or_above());

-- ============================================================
-- Shipping settings — public read, manager+ write
-- ============================================================
alter table shipping_settings enable row level security;

create policy "shipping_settings_public_read" on shipping_settings for select using (true);
create policy "shipping_settings_manager_write" on shipping_settings
  for update using (is_manager_or_above());

-- ============================================================
-- Newsletter — anyone can insert (subscribe); only staff read the list
-- ============================================================
alter table newsletter_subscribers enable row level security;

create policy "newsletter_public_insert" on newsletter_subscribers
  for insert with check (true);

create policy "newsletter_staff_select" on newsletter_subscribers
  for select using (is_staff_or_above());
