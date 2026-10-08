-- ============================================================
-- Glam Soles BD — Migration 014
-- Phase 9: Admin Panel Core — database-level guarantees
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- Run this file's contents in: Supabase Dashboard → SQL Editor → New query → Run
-- Run migrations 001–013 first.
-- ============================================================

-- ---------- Product: Weight field (admin product form) ----------
alter table products add column if not exists weight_grams integer check (weight_grams is null or weight_grams >= 0);

-- ============================================================
-- SECURITY: role changes must always be admin-only, no matter which
-- client made the request. RLS (migration 005) already lets a Manager
-- update most profile columns for customer support (account_status,
-- membership_tier). Without this trigger a Manager could also rewrite
-- `role` — including promoting themselves to admin. A BEFORE UPDATE
-- trigger enforces this at the database layer regardless of the
-- calling client's RLS policy, closing that privilege-escalation gap.
-- ============================================================
create or replace function prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only an admin can change a user role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on profiles;
create trigger trg_profiles_role_guard
  before update on profiles
  for each row execute function prevent_unauthorized_role_change();

-- ============================================================
-- SECURITY: refunds are a Manager/Admin decision, not routine Staff
-- order-fulfillment work. RLS (migration 005) lets any staff_or_above
-- update a payment row (so Staff can mark COD "Collected"/"Failed"
-- during delivery). This trigger additionally requires manager_or_above
-- specifically for the `refunded` transition.
-- ============================================================
create or replace function guard_payment_status_transition()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.payment_status is distinct from old.payment_status
     and new.payment_status = 'refunded'
     and not is_manager_or_above() then
    raise exception 'Only a manager or admin can mark a payment refunded';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payments_status_guard on payments;
create trigger trg_payments_status_guard
  before update on payments
  for each row execute function guard_payment_status_transition();

-- ============================================================
-- SECURITY: tighten catalog image storage writes to Manager/Admin only.
-- Migration 007 allowed any staff_or_above to write product/banner/
-- category images. Per the role matrix (Admin = full; Manager =
-- products/orders/inventory/customers; Staff = orders/basic support),
-- product imagery is a Manager+ responsibility.
-- ============================================================
drop policy if exists "catalog_images_staff_write" on storage.objects;
drop policy if exists "catalog_images_staff_update" on storage.objects;
drop policy if exists "catalog_images_staff_delete" on storage.objects;

create policy "catalog_images_manager_write"
  on storage.objects for insert
  with check (bucket_id in ('products', 'banners', 'categories') and is_manager_or_above());

create policy "catalog_images_manager_update"
  on storage.objects for update
  using (bucket_id in ('products', 'banners', 'categories') and is_manager_or_above());

create policy "catalog_images_manager_delete"
  on storage.objects for delete
  using (bucket_id in ('products', 'banners', 'categories') and is_manager_or_above());

-- ============================================================
-- Dashboard summary — one round trip for the admin overview cards.
-- staff_or_above only; callable by authenticated users, but the
-- function itself refuses to return data to anyone else.
-- ============================================================
create or replace function admin_dashboard_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not is_staff_or_above() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'total_revenue', coalesce((
      select sum(grand_total) from orders
      where created_at >= p_from and created_at < p_to and status <> 'cancelled'
    ), 0),
    'total_orders', coalesce((
      select count(*) from orders where created_at >= p_from and created_at < p_to
    ), 0),
    'new_customers', coalesce((
      select count(*) from profiles
      where created_at >= p_from and created_at < p_to and role = 'customer'
    ), 0),
    'total_customers', coalesce((select count(*) from profiles where role = 'customer'), 0),
    'total_products', coalesce((select count(*) from products), 0),
    'pending_orders', coalesce((select count(*) from orders where status = 'pending'), 0),
    'low_stock_count', coalesce((
      select count(*) from product_variants where stock > 0 and stock <= low_stock_threshold
    ), 0),
    'out_of_stock_count', coalesce((select count(*) from product_variants where stock = 0), 0),
    'returns_pending', coalesce((
      select count(*) from returns where status = 'requested'
    ), 0),
    'refunds_count', coalesce((
      select count(*) from payments
      where payment_status = 'refunded' and updated_at >= p_from and updated_at < p_to
    ), 0)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function admin_dashboard_summary(timestamptz, timestamptz) to authenticated;

-- ============================================================
-- Dashboard time series — daily buckets for Sales/Revenue/Orders/
-- Customers charts across the selected date range, gap-filled with
-- generate_series so empty days render as zero instead of vanishing.
-- ============================================================
create or replace function admin_dashboard_series(p_from timestamptz, p_to timestamptz)
returns table (bucket_date date, revenue numeric, orders_count bigint, new_customers bigint)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not is_staff_or_above() then
    raise exception 'Not authorized';
  end if;

  return query
  with days as (
    select generate_series(date_trunc('day', p_from), date_trunc('day', p_to), interval '1 day')::date as d
  ),
  daily_orders as (
    select date_trunc('day', o.created_at)::date as d,
           sum(o.grand_total) filter (where o.status <> 'cancelled') as revenue,
           count(*) as orders_count
    from orders o
    where o.created_at >= p_from and o.created_at < p_to
    group by 1
  ),
  daily_customers as (
    select date_trunc('day', p.created_at)::date as d, count(*) as new_customers
    from profiles p
    where p.created_at >= p_from and p.created_at < p_to and p.role = 'customer'
    group by 1
  )
  select
    days.d as bucket_date,
    coalesce(daily_orders.revenue, 0) as revenue,
    coalesce(daily_orders.orders_count, 0) as orders_count,
    coalesce(daily_customers.new_customers, 0) as new_customers
  from days
  left join daily_orders on daily_orders.d = days.d
  left join daily_customers on daily_customers.d = days.d
  order by days.d;
end;
$$;

grant execute on function admin_dashboard_series(timestamptz, timestamptz) to authenticated;
