-- ============================================================
-- Glam Soles BD — Migration 013
-- Phase 8: Order Tracking & Customer Account
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================
--
-- Run migrations 001–012 first.
--
-- This migration:
--   1. Adds courier/tracking fields to orders (populated by staff in the
--      Phase 9 admin panel; nullable until then).
--   2. Creates a private "returns" storage bucket + policies for
--      return/exchange evidence photos.
--   3. Adds a trigger that writes a real notification row whenever a
--      signed-in customer's order is created or changes status, so the
--      Notifications account section has real data to show.
--   4. Adds the `track_order` RPC used by the public /track-order page —
--      it never exposes another customer's order.

-- ---------- 1. Courier / tracking fields ----------
alter table orders add column if not exists courier_name text;
alter table orders add column if not exists tracking_number text;

-- ---------- 1b. Prevent duplicate active return/exchange requests ----------
-- A customer can request again after a rejection, but never two open
-- requests for the same order item at once (defence in depth alongside
-- the eligibility check in requestReturn()/getReturnEligibleItems()).
create unique index if not exists idx_returns_one_active_per_item
  on returns (order_item_id)
  where status <> 'rejected';

-- ---------- 2. Returns evidence photos (private bucket) ----------
insert into storage.buckets (id, name, public)
values ('returns', 'returns', false)
on conflict (id) do nothing;

-- Convention: object path must be "<user_id>/<filename>" so ownership
-- can be checked from the path itself, same as the reviews bucket.
create policy "return_photos_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'returns'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "return_photos_owner_or_staff_read"
  on storage.objects for select
  using (
    bucket_id = 'returns'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_staff_or_above())
  );

create policy "return_photos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'returns'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_staff_or_above())
  );

-- ---------- 3. Order status notifications ----------
create or replace function notify_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_type text;
  v_title text;
begin
  -- Guest orders have no account to notify.
  if new.user_id is null then
    return new;
  end if;
  -- Only notify on genuine status changes (or the first insert).
  if TG_OP = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  v_type := case new.status
    when 'shipped' then 'shipping'
    when 'out_for_delivery' then 'shipping'
    when 'delivered' then 'delivery'
    else 'order'
  end;

  v_title := case new.status
    when 'pending' then 'Order received'
    when 'confirmed' then 'Order confirmed'
    when 'processing' then 'Order is being processed'
    when 'packed' then 'Order packed'
    when 'shipped' then 'Order shipped'
    when 'out_for_delivery' then 'Order out for delivery'
    when 'delivered' then 'Order delivered'
    when 'cancelled' then 'Order cancelled'
    when 'returned' then 'Order returned'
    else 'Order update'
  end;

  insert into notifications (user_id, type, title, body)
  values (
    new.user_id,
    v_type,
    v_title,
    'Order ' || new.order_number || ' is now ' || replace(new.status::text, '_', ' ') || '.'
  );

  return new;
end;
$$;

drop trigger if exists trg_orders_notify_status on orders;
create trigger trg_orders_notify_status
  after insert or update of status on orders
  for each row execute function notify_order_status_change();

-- ---------- 4. track_order RPC ----------
-- Guests must supply either the confirmation token from their order-success
-- link, or the order number + the phone number used at checkout. Signed-in
-- customers may look up any of their own orders by order number alone.
-- Never exposes another customer's order.
create or replace function track_order(
  p_order_number text,
  p_phone text default null,
  p_confirmation_token text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'order', jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'courier_name', o.courier_name,
      'tracking_number', o.tracking_number,
      'delivery_zone', o.delivery_zone,
      'guest_name', o.guest_name,
      'guest_phone', o.guest_phone,
      'subtotal', o.subtotal,
      'discount_amount', o.discount_amount,
      'delivery_fee', o.delivery_fee,
      'grand_total', o.grand_total,
      'shipping_address', o.shipping_address_snapshot,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name,
        'color', oi.color,
        'size', oi.size,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total
      ) order by oi.id)
      from order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o
  where o.order_number = upper(trim(p_order_number))
    and (
      -- Owner, signed in
      (o.user_id is not null and o.user_id = auth.uid())
      -- Guest with the confirmation token from their order-success link
      or (p_confirmation_token is not null and o.confirmation_token = p_confirmation_token)
      -- Guest with the phone number used at checkout
      or (p_phone is not null and o.guest_phone = p_phone)
    );
$$;

revoke all on function track_order(text, text, text) from public;
grant execute on function track_order(text, text, text) to anon, authenticated;
