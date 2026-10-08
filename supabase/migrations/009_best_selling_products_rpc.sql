-- ============================================================
-- Glam Soles BD — Migration 009
-- Best-selling products RPC (real sales data only)
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================
-- Ranks published products by units sold, counted from real
-- order_items on orders that were not cancelled. Never derived
-- from client input, never fabricated. If there is no real sales
-- history yet, this returns zero rows and the homepage falls
-- back to an empty state rather than fake metrics.
--
-- SECURITY DEFINER is required because `orders` is protected by
-- RLS (customers can only see their own orders) — this function
-- only ever returns an aggregated product_id + units_sold count,
-- never any customer or order-identifying data.
-- ============================================================

create or replace function get_best_selling_products(p_limit integer default 8)
returns table (product_id uuid, units_sold bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as product_id,
    sum(oi.quantity)::bigint as units_sold
  from order_items oi
  join orders o on o.id = oi.order_id
  join product_variants pv on pv.id = oi.variant_id
  join products p on p.id = pv.product_id
  where p.is_published = true
    and o.status not in ('cancelled', 'pending')
  group by p.id
  order by units_sold desc
  limit greatest(p_limit, 0);
$$;

grant execute on function get_best_selling_products(integer) to anon, authenticated;
