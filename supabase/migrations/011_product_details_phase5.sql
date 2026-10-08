-- ============================================================
-- Glam Soles BD — Migration 011
-- Phase 5: Product Details support
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- ---------- Variant-specific gallery images ----------
-- Optional per-color image set. When null/empty the product page falls
-- back to the product's own `images`. Lets selecting a color swap the
-- gallery without a second products table.
alter table product_variants
  add column if not exists images text[];

-- ---------- Performance: order_items by variant ----------
-- Needed for "Frequently Bought Together" (co-purchase lookups) and any
-- future per-variant sales reporting. idx_order_items_order already
-- covers order_id; this covers the other join direction.
create index if not exists idx_order_items_variant on order_items (variant_id);

-- ---------- One review per customer per product ----------
-- Prevents a customer from posting unlimited reviews for the same
-- product. Enforced in the database, not just the UI.
create unique index if not exists idx_reviews_one_per_user_per_product
  on reviews (product_id, user_id);

-- Composite index for the product page's "approved reviews for this
-- product, newest first" query.
create index if not exists idx_reviews_product_approved_created
  on reviews (product_id, is_approved, created_at desc);

-- ---------- Related products ("You May Also Like") ----------
-- Same category (or same top-level parent when the product's own
-- category has no siblings), published + active, excluding itself.
-- No fake data: returns [] when nothing else qualifies.
create or replace function get_related_products(p_product_id uuid, p_limit integer default 8)
returns table (product_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select p.id, p.category_id, c.parent_id
    from products p
    join categories c on c.id = p.category_id
    where p.id = p_product_id
  ),
  candidate_categories as (
    select id from categories where id in (select category_id from target)
    union
    select id from categories where parent_id in (select parent_id from target where parent_id is not null)
    union
    select id from categories where id in (select parent_id from target where parent_id is not null)
  )
  select p.id as product_id
  from products p
  where p.category_id in (select id from candidate_categories)
    and p.id <> p_product_id
    and p.is_published = true
    and p.is_active = true
  order by p.created_at desc
  limit greatest(p_limit, 0);
$$;

grant execute on function get_related_products(uuid, integer) to anon, authenticated;

-- ---------- Frequently Bought Together ----------
-- Looks at real (non-cancelled) orders that contained this product and
-- ranks the other products that most often appeared alongside it.
-- SECURITY DEFINER because `orders`/`order_items` are RLS-protected —
-- this only ever returns aggregated product_id + co-purchase counts,
-- never order- or customer-identifying data.
create or replace function get_frequently_bought_together(p_product_id uuid, p_limit integer default 4)
returns table (product_id uuid, co_purchase_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with target_orders as (
    select distinct oi.order_id
    from order_items oi
    join product_variants pv on pv.id = oi.variant_id
    where pv.product_id = p_product_id
  )
  select p.id as product_id, count(distinct oi.order_id)::bigint as co_purchase_count
  from order_items oi
  join orders o on o.id = oi.order_id
  join product_variants pv on pv.id = oi.variant_id
  join products p on p.id = pv.product_id
  where oi.order_id in (select order_id from target_orders)
    and p.id <> p_product_id
    and p.is_published = true
    and p.is_active = true
    and o.status not in ('cancelled', 'pending')
  group by p.id
  order by co_purchase_count desc
  limit greatest(p_limit, 0);
$$;

grant execute on function get_frequently_bought_together(uuid, integer) to anon, authenticated;

-- ---------- Public review reads with a safe author label ----------
-- `profiles` is RLS-locked to "own row or staff" (migration 005), so a
-- storefront visitor cannot join reviews -> profiles directly. This
-- function returns only a masked display name ("Jamila R.") alongside
-- the approved review — never the full profile, phone, or email.
create or replace function get_product_reviews(p_product_id uuid)
returns table (
  id uuid,
  rating integer,
  body text,
  size_feedback text,
  photo_urls text[],
  is_verified_purchase boolean,
  created_at timestamptz,
  author_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.rating,
    r.body,
    r.size_feedback,
    r.photo_urls,
    r.is_verified_purchase,
    r.created_at,
    case
      when pr.full_name is null or length(trim(pr.full_name)) = 0 then 'Glam Soles customer'
      else split_part(trim(pr.full_name), ' ', 1)
        || case
             when position(' ' in trim(pr.full_name)) > 0
               then ' ' || left(split_part(trim(pr.full_name), ' ', 2), 1) || '.'
             else ''
           end
    end as author_display_name
  from reviews r
  left join profiles pr on pr.id = r.user_id
  where r.product_id = p_product_id
    and r.is_approved = true
  order by r.created_at desc;
$$;

grant execute on function get_product_reviews(uuid) to anon, authenticated;

-- Whether the current authenticated user already reviewed this product
-- (used to show "You already reviewed this" instead of the form) and
-- whether they have at least one delivered order line for it (used for
-- "Verified Purchase" hinting client-side — the real check still runs
-- server-side in the trigger on insert).
create or replace function get_my_review_eligibility(p_product_id uuid)
returns table (has_reviewed boolean, has_delivered_purchase boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from reviews where product_id = p_product_id and user_id = auth.uid()
    ) as has_reviewed,
    exists (
      select 1
      from order_items oi
      join orders o on o.id = oi.order_id
      join product_variants pv on pv.id = oi.variant_id
      where pv.product_id = p_product_id
        and o.user_id = auth.uid()
        and o.status = 'delivered'
    ) as has_delivered_purchase;
$$;

grant execute on function get_my_review_eligibility(uuid) to authenticated;
