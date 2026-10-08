-- ============================================================
-- Glam Soles BD — Migration 015
-- Phase 10: Homepage CMS (testimonials, featured products,
-- section visibility) — Returns, Banners, Shipping and Analytics
-- all reuse tables/policies that already exist (migrations
-- 003, 004, 005, 010) and need no schema changes.
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- ---------- Testimonials ----------
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_role text,
  rating integer not null default 5 check (rating between 1 and 5),
  quote text not null,
  photo_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_testimonials_active on testimonials (is_active, sort_order);

-- ---------- Featured products (manual homepage curation, separate from
-- the algorithmic New Arrivals / Best Sellers sections) ----------
create table if not exists featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references products (id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_featured_products_active on featured_products (is_active, sort_order);

-- ---------- Homepage section visibility/order ----------
-- One row per homepage section the storefront can show or hide. The
-- storefront reads is_active for each section_key; admin toggles/reorders
-- them here instead of a code change.
create table if not exists homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_homepage_sections_updated_at on homepage_sections;
create trigger trg_homepage_sections_updated_at
  before update on homepage_sections
  for each row execute function set_updated_at();

insert into homepage_sections (section_key, label, sort_order) values
  ('hero', 'Hero Banner', 0),
  ('shop_by_category', 'Shop by Category', 1),
  ('womens_collection', 'Women''s Collection', 2),
  ('mens_collection', 'Men''s Collection', 3),
  ('kids_collection', 'Kids'' Collection', 4),
  ('accessories_collection', 'Accessories', 5),
  ('featured_products', 'Featured Products', 6),
  ('new_arrivals', 'New Arrivals', 7),
  ('best_sellers', 'Best Sellers', 8),
  ('promo_banners', 'Promotional Banners', 9),
  ('why_us', 'Why Glam Soles BD', 10),
  ('rewards_teaser', 'Rewards Teaser', 11),
  ('testimonials', 'Testimonials', 12),
  ('newsletter', 'Newsletter', 13)
on conflict (section_key) do nothing;

-- ============================================================
-- RLS — public reads active content; manager+ manages all of it.
-- Same shape as banners/promotions (migration 005).
-- ============================================================
alter table testimonials enable row level security;
alter table featured_products enable row level security;
alter table homepage_sections enable row level security;

create policy "testimonials_public_read_active" on testimonials
  for select using (is_active = true or is_manager_or_above());

create policy "testimonials_manager_write" on testimonials
  for all using (is_manager_or_above()) with check (is_manager_or_above());

create policy "featured_products_public_read_active" on featured_products
  for select using (is_active = true or is_manager_or_above());

create policy "featured_products_manager_write" on featured_products
  for all using (is_manager_or_above()) with check (is_manager_or_above());

-- Every section's active flag is readable by anyone (the storefront needs
-- it to decide what to render) — nothing sensitive lives in this table.
create policy "homepage_sections_public_read" on homepage_sections
  for select using (true);

create policy "homepage_sections_manager_write" on homepage_sections
  for update using (is_manager_or_above());
