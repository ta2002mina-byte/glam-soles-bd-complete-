-- ============================================================
-- Glam Soles BD — Migration 006
-- Secure order creation (server-side authority over price/stock/total)
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- Input shape (passed as jsonb array):
--   [{ "variant_id": "uuid", "quantity": 2 }, ...]
--
-- This function is the ONLY way orders/order_items/payments get created.
-- It:
--   1. Re-reads current product/variant price and stock from the DB
--      (never trusts any price sent by the client).
--   2. Validates stock and decrements it atomically.
--   3. Recalculates subtotal, applies coupon validation server-side.
--   4. Uses idempotency_key to make retries/double-clicks safe.
--   5. Creates the order, order_items and a pending COD payment row
--      in a single transaction.

create or replace function create_order(
  p_user_id uuid,
  p_shipping_address_id uuid,
  p_items jsonb,
  p_coupon_code text default null,
  p_delivery_zone text default 'inside_dhaka', -- 'inside_dhaka' | 'outside_dhaka' | 'express'
  p_idempotency_key text default null,
  p_guest_name text default null,
  p_guest_phone text default null,
  p_guest_email text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_existing_order_id uuid;
  v_item jsonb;
  v_variant record;
  v_subtotal numeric(10, 2) := 0;
  v_line_total numeric(10, 2);
  v_delivery_fee numeric(10, 2);
  v_discount numeric(10, 2) := 0;
  v_grand_total numeric(10, 2);
  v_coupon record;
  v_coupon_id uuid;
  v_settings record;
  v_order_number text;
begin
  -- Idempotency: if this key was already used, return the existing order.
  if p_idempotency_key is not null then
    select id into v_existing_order_id from orders where idempotency_key = p_idempotency_key;
    if v_existing_order_id is not null then
      return v_existing_order_id;
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  select * into v_settings from shipping_settings where id = 1;

  v_delivery_fee := case p_delivery_zone
    when 'outside_dhaka' then v_settings.outside_dhaka_fee
    when 'express' then v_settings.express_fee
    else v_settings.inside_dhaka_fee
  end;

  v_order_number := 'GSB-' || to_char(now(), 'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    shipping_address_id, status, subtotal, discount_amount,
    delivery_fee, grand_total, idempotency_key
  ) values (
    v_order_number, p_user_id, p_guest_name, p_guest_phone, p_guest_email,
    p_shipping_address_id, 'pending', 0, 0, v_delivery_fee, 0, p_idempotency_key
  ) returning id into v_order_id;

  -- Validate stock + build order_items using current DB prices (never client prices).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select pv.id, pv.color, pv.size, pv.stock, p.name,
           coalesce(pv.price_override, p.sale_price, p.regular_price) as unit_price
    into v_variant
    from product_variants pv
    join products p on p.id = pv.product_id
    where pv.id = (v_item ->> 'variant_id')::uuid
    for update of pv;

    if v_variant.id is null then
      raise exception 'Product variant not found: %', v_item ->> 'variant_id';
    end if;

    if not decrement_variant_stock(v_variant.id, (v_item ->> 'quantity')::integer) then
      raise exception 'Insufficient stock for %/% (%)', v_variant.color, v_variant.size, v_variant.name;
    end if;

    v_line_total := v_variant.unit_price * (v_item ->> 'quantity')::integer;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (order_id, variant_id, product_name, color, size, unit_price, quantity, line_total)
    values (
      v_order_id, v_variant.id, v_variant.name, v_variant.color, v_variant.size,
      v_variant.unit_price, (v_item ->> 'quantity')::integer, v_line_total
    );
  end loop;

  -- Coupon validation — entirely server-side.
  if p_coupon_code is not null then
    select * into v_coupon from coupons
    where code = p_coupon_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or usage_count < usage_limit)
      and v_subtotal >= min_order_amount;

    if v_coupon.id is null then
      raise exception 'Coupon is invalid or no longer applicable';
    end if;

    v_discount := case v_coupon.type
      when 'percentage' then round(v_subtotal * v_coupon.value / 100, 2)
      when 'fixed' then v_coupon.value
      when 'free_delivery' then v_delivery_fee
      else 0
    end;

    v_coupon_id := v_coupon.id;
    update coupons set usage_count = usage_count + 1 where id = v_coupon_id;
    insert into coupon_usage (coupon_id, user_id, order_id) values (v_coupon_id, p_user_id, v_order_id);
  end if;

  v_grand_total := greatest(v_subtotal - v_discount, 0) + v_delivery_fee;

  update orders
  set subtotal = v_subtotal,
      discount_amount = v_discount,
      grand_total = v_grand_total,
      status = 'confirmed',
      coupon_id = v_coupon_id
  where id = v_order_id;

  insert into payments (order_id, payment_method, payment_status, amount)
  values (v_order_id, 'cod', 'pending', v_grand_total);

  return v_order_id;
end;
$$;

-- Mark a COD payment as collected (staff/manager/admin only — enforced by
-- the payments RLS update policy from migration 005, this function just
-- keeps the order status in sync).
create or replace function mark_cod_collected(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_staff_or_above() then
    raise exception 'Not authorized';
  end if;

  update payments
  set payment_status = 'collected', paid_at = now()
  where order_id = p_order_id;

  update orders set status = 'delivered' where id = p_order_id and status = 'out_for_delivery';
end;
$$;
