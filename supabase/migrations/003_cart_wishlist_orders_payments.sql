-- ============================================================
-- Glam Soles BD — Migration 003
-- Cart, Wishlist, Orders, Payments, Shipping Addresses
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- ---------- Shipping addresses ----------
create table if not exists shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  label text not null default 'home' check (label in ('home', 'office', 'other')),
  full_name text not null,
  phone text not null,
  division text not null,
  district text not null,
  area text not null,
  full_address text not null,
  delivery_note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on shipping_addresses (user_id);

-- ---------- Cart ----------
create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  guest_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token is not null)
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create index if not exists idx_cart_items_cart on cart_items (cart_id);

-- ---------- Wishlist ----------
create table if not exists wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references wishlists (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

-- ---------- Coupons ----------
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type coupon_type not null,
  value numeric(10, 2) not null check (value >= 0),
  min_order_amount numeric(10, 2) not null default 0,
  applies_to_category_id uuid references categories (id),
  membership_tier_required membership_tier,
  first_order_only boolean not null default false,
  usage_limit integer,
  usage_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  order_id uuid,
  used_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

-- ---------- Orders ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references profiles (id),
  guest_name text,
  guest_phone text,
  guest_email text,
  shipping_address_id uuid references shipping_addresses (id),
  status order_status not null default 'pending',
  subtotal numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  coupon_id uuid references coupons (id),
  grand_total numeric(10, 2) not null,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on orders (user_id);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created on orders (created_at desc);

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  variant_id uuid not null references product_variants (id),
  product_name text not null,
  color text not null,
  size text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null
);

create index if not exists idx_order_items_order on order_items (order_id);

-- ---------- Payments ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  payment_method payment_method not null default 'cod',
  payment_status payment_status not null default 'pending',
  amount numeric(10, 2) not null,
  currency text not null default 'BDT',
  transaction_reference text,
  provider text,
  provider_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payments_updated_at on payments;
create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

create index if not exists idx_payments_order on payments (order_id);

-- ---------- Shipping settings (admin-controlled delivery fees) ----------
create table if not exists shipping_settings (
  id integer primary key default 1,
  inside_dhaka_fee numeric(10, 2) not null default 60,
  outside_dhaka_fee numeric(10, 2) not null default 120,
  express_fee numeric(10, 2) not null default 150,
  free_shipping_threshold numeric(10, 2),
  express_enabled boolean not null default false,
  check (id = 1)
);

insert into shipping_settings (id) values (1) on conflict (id) do nothing;
