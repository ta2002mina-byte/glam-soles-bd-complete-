-- ============================================================
-- Glam Soles BD — Migration 001
-- Enums, Profiles/Roles, Categories, Brands
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- Run this file's contents in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('customer', 'staff', 'manager', 'admin');

create type order_status as enum (
  'pending', 'confirmed', 'processing', 'packed',
  'shipped', 'out_for_delivery', 'delivered',
  'cancelled', 'returned'
);

create type payment_method as enum ('cod', 'bkash', 'nagad', 'card');
create type payment_status as enum ('pending', 'collected', 'failed', 'refunded');

create type membership_tier as enum ('bronze', 'silver', 'gold', 'platinum');

create type return_reason as enum (
  'wrong_size', 'wrong_product', 'damaged', 'defective', 'other'
);
create type return_status as enum (
  'requested', 'approved', 'rejected', 'exchanged', 'refunded', 'completed'
);

create type coupon_type as enum ('percentage', 'fixed', 'free_delivery');

-- ---------- Profiles (extends auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  membership_tier membership_tier not null default 'bronze',
  reward_points integer not null default 0,
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on profiles (role);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Brands ----------
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

-- ---------- Categories (self-referencing for subcategories) ----------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  banner_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_parent on categories (parent_id);

-- ---------- updated_at helper ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();
