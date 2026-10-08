-- ============================================================
-- Glam Soles BD — Migration 002
-- Products, Variants, Inventory
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  category_id uuid not null references categories (id),
  brand_id uuid references brands (id),
  description text,
  materials text,
  features text[],
  size_fit_notes text,
  regular_price numeric(10, 2) not null check (regular_price >= 0),
  sale_price numeric(10, 2) check (sale_price >= 0),
  cost_price numeric(10, 2) check (cost_price >= 0),
  tags text[],
  seo_title text,
  seo_description text,
  seo_keywords text[],
  images text[] not null default '{}',
  video_url text,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_brand on products (brand_id);
create index if not exists idx_products_published on products (is_published) where is_published = true;
create index if not exists idx_products_slug on products (slug);
create index if not exists idx_products_tags on products using gin (tags);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Discount is always derived server-side, never trusted from the client.
create or replace function product_discount_percent(regular numeric, sale numeric)
returns integer language sql immutable as $$
  select case
    when sale is null or sale <= 0 or sale >= regular then 0
    else round(((regular - sale) / regular) * 100)::integer
  end;
$$;

-- ---------- Product variants (color + size) ----------
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  color text not null,
  size text not null,
  sku text not null unique,
  price_override numeric(10, 2) check (price_override >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  unique (product_id, color, size)
);

create index if not exists idx_variants_product on product_variants (product_id);
create index if not exists idx_variants_low_stock on product_variants (stock) where stock <= low_stock_threshold;

-- Safe, atomic stock decrement — prevents overselling under concurrent orders.
create or replace function decrement_variant_stock(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  update product_variants
  set stock = stock - p_quantity
  where id = p_variant_id and stock >= p_quantity;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function restock_variant(p_variant_id uuid, p_quantity integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update product_variants
  set stock = stock + p_quantity
  where id = p_variant_id;
end;
$$;
