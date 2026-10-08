-- ============================================================
-- Glam Soles BD — Migration 012
-- Phase 7: secure guest/authenticated COD checkout
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================
--
-- Run migrations 001–011 first. This migration is intentionally
-- separate so the checkout authority can be reviewed and deployed
-- without changing the storefront UI.

-- Guest orders need a durable address snapshot. Do not depend on a
-- customer's saved-address row, which requires an authenticated user.
alter table orders add column if not exists delivery_zone text not null default 'inside_dhaka';
alter table orders drop constraint if exists orders_delivery_zone_check;
alter table orders add constraint orders_delivery_zone_check
  check (delivery_zone in ('inside_dhaka', 'outside_dhaka', 'express'));
alter table orders add column if not exists delivery_note text;
alter table orders add column if not exists shipping_address_snapshot jsonb;
alter table orders add column if not exists confirmation_token text;
create unique index if not exists idx_orders_confirmation_token
  on orders (confirmation_token) where confirmation_token is not null;

-- Guests do not have a profiles row. The order itself remains the owner of
-- the address and coupon-use record.
alter table coupon_usage alter column user_id drop not null;

-- The client may only call this RPC with variant IDs and quantities. Every
-- price, product state, stock value, coupon rule, shipping fee and payment
-- value below is read from the database in one transaction.
create or replace function create_cod_order(
  p_user_id uuid,
  p_items jsonb,
  p_address jsonb,
  p_delivery_zone text default 'inside_dhaka',
  p_coupon_code text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_existing_order_id uuid;
  v_item jsonb;
  v_variant record;
  v_address record;
  v_coupon record;
  v_settings record;
  v_order_number text;
  v_confirmation_token text;
  v_subtotal numeric(10,2) := 0;
  v_eligible_subtotal numeric(10,2) := 0;
  v_line_total numeric(10,2);
  v_unit_price numeric(10,2);
  v_base_delivery_fee numeric(10,2);
  v_delivery_fee numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_product_discount numeric(10,2) := 0;
  v_grand_total numeric(10,2);
  v_quantity integer;
  v_coupon_id uuid;
  v_free_delivery boolean := false;
  v_usage_updated integer;
  v_first_order_count integer;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 16 then
    raise exception 'A valid idempotency key is required';
  end if;

  -- A transaction-scoped advisory lock closes the race between two
  -- browser retries arriving before the unique index can reject one.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  select id into v_existing_order_id
  from orders
  where idempotency_key = p_idempotency_key;
  if v_existing_order_id is not null then
    return (
      select jsonb_build_object(
        'order_id', id,
        'order_number', order_number,
        'confirmation_token', confirmation_token,
        'subtotal', subtotal,
        'discount_amount', discount_amount,
        'delivery_fee', delivery_fee,
        'grand_total', grand_total,
        'estimated_delivery',
          case delivery_zone
            when 'express' then '1–2 working days'
            when 'outside_dhaka' then '3–5 working days'
            else '2–4 working days'
          end
      )
      from orders where id = v_existing_order_id
    );
  end if;

  if p_user_id is not null and coalesce(auth.uid()::text, '') <> p_user_id::text then
    raise exception 'Not authorized';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  if p_delivery_zone not in ('inside_dhaka', 'outside_dhaka', 'express') then
    raise exception 'Invalid delivery zone';
  end if;
  if jsonb_array_length(p_items) <> (
    select count(distinct value->>'variant_id')
    from jsonb_array_elements(p_items)
  ) then
    raise exception 'Duplicate cart item';
  end if;

  select * into v_address
  from jsonb_to_record(p_address) as a(
    full_name text,
    phone text,
    email text,
    division text,
    district text,
    area text,
    full_address text,
    delivery_note text
  );
  if v_address.full_name is null or length(trim(v_address.full_name)) < 2
     or v_address.phone is null
     or v_address.division is null or v_address.district is null
     or v_address.area is null or v_address.full_address is null
     or length(trim(v_address.full_address)) < 8 then
    raise exception 'Complete delivery information is required';
  end if;
  if v_address.phone !~ '^(?:\+?8801|01)[3-9][0-9]{8}$' then
    raise exception 'Invalid phone number';
  end if;

  select * into v_settings
  from shipping_settings
  where id = 1
  for update;
  if v_settings.id is null then
    raise exception 'Shipping settings are not configured';
  end if;
  if p_delivery_zone = 'express' and not v_settings.express_enabled then
    raise exception 'Express delivery is unavailable';
  end if;
  v_base_delivery_fee := case p_delivery_zone
    when 'outside_dhaka' then v_settings.outside_dhaka_fee
    when 'express' then v_settings.express_fee
    else v_settings.inside_dhaka_fee
  end;
  v_delivery_fee := case
    when v_settings.free_shipping_threshold is not null
      and v_settings.free_shipping_threshold <= 0
    then 0
    else v_base_delivery_fee
  end;

  v_order_number := 'GSB-' || to_char(now(), 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_confirmation_token := replace(gen_random_uuid()::text, '-', '');

  insert into orders (
    order_number, user_id, guest_name, guest_phone, guest_email,
    status, subtotal, discount_amount, delivery_fee, grand_total,
    delivery_zone, delivery_note, shipping_address_snapshot,
    confirmation_token, idempotency_key
  ) values (
    v_order_number, p_user_id, v_address.full_name, v_address.phone, nullif(v_address.email, ''),
    'pending', 0, 0, v_delivery_fee, 0,
    p_delivery_zone, v_address.delivery_note,
    jsonb_build_object(
      'full_name', v_address.full_name, 'phone', v_address.phone,
      'email', v_address.email, 'division', v_address.division,
      'district', v_address.district, 'area', v_address.area,
      'full_address', v_address.full_address,
      'delivery_note', v_address.delivery_note
    ),
    v_confirmation_token, p_idempotency_key
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 99 then
      raise exception 'Invalid quantity';
    end if;

    select pv.id, pv.color, pv.size, pv.stock, pv.price_override,
           p.id as product_id, p.name, p.regular_price, p.sale_price,
           p.category_id, p.is_active, p.is_published
    into v_variant
    from product_variants pv
    join products p on p.id = pv.product_id
    where pv.id = (v_item->>'variant_id')::uuid
    for update of pv;

    if v_variant.id is null or not v_variant.is_active or not v_variant.is_published then
      raise exception 'Product is no longer available';
    end if;
    if v_variant.stock < v_quantity then
      raise exception 'Insufficient stock for %', v_variant.name;
    end if;

    v_unit_price := coalesce(
      v_variant.price_override,
      case when v_variant.sale_price is not null
        and v_variant.sale_price > 0
        and v_variant.sale_price < v_variant.regular_price
        then v_variant.sale_price else v_variant.regular_price end
    );
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    update product_variants
      set stock = stock - v_quantity
      where id = v_variant.id and stock >= v_quantity;
    if not found then
      raise exception 'Stock changed. Please review your bag.';
    end if;

    insert into order_items (
      order_id, variant_id, product_name, color, size,
      unit_price, quantity, line_total
    ) values (
      v_order_id, v_variant.id, v_variant.name, v_variant.color, v_variant.size,
      v_unit_price, v_quantity, v_line_total
    );
  end loop;

  if v_settings.free_shipping_threshold is not null
     and v_subtotal >= v_settings.free_shipping_threshold then
    v_delivery_fee := 0;
  end if;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon
    from coupons
    where code = upper(trim(p_coupon_code))
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
    for update;
    if v_coupon.id is null then raise exception 'Coupon is invalid or expired'; end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
      raise exception 'Coupon has reached its usage limit';
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'Coupon minimum order amount is not met';
    end if;
    if v_coupon.membership_tier_required is not null then
      if p_user_id is null then raise exception 'Sign in to use this coupon'; end if;
      if not exists (
        select 1 from profiles
        where id = p_user_id
          and array_position(array['bronze','silver','gold','platinum'], membership_tier::text)
              >= array_position(array['bronze','silver','gold','platinum'], v_coupon.membership_tier_required::text)
      ) then raise exception 'Membership requirement is not met'; end if;
    end if;
    if v_coupon.first_order_only then
      if p_user_id is null then raise exception 'Sign in to use this coupon'; end if;
      select count(*) into v_first_order_count
      from orders where user_id = p_user_id and status <> 'cancelled';
      if v_first_order_count > 0 then raise exception 'Coupon is only valid on a first order'; end if;
    end if;

    if v_coupon.applies_to_category_id is not null then
      select coalesce(sum(oi.line_total), 0) into v_eligible_subtotal
      from order_items oi
      join product_variants pv on pv.id = oi.variant_id
      join products p on p.id = pv.product_id
      where oi.order_id = v_order_id and p.category_id = v_coupon.applies_to_category_id;
      if v_eligible_subtotal <= 0 then raise exception 'Coupon does not apply to these items'; end if;
    else
      v_eligible_subtotal := v_subtotal;
    end if;

    if v_coupon.type = 'percentage' then
      v_product_discount := least(v_eligible_subtotal, round(v_eligible_subtotal * least(v_coupon.value, 100) / 100, 2));
    elsif v_coupon.type = 'fixed' then
      v_product_discount := least(v_eligible_subtotal, v_coupon.value);
    elsif v_coupon.type = 'free_delivery' then
      v_free_delivery := true;
    end if;
    if v_free_delivery then
      v_discount := v_product_discount + v_delivery_fee;
      v_delivery_fee := 0;
    else
      v_discount := v_product_discount;
    end if;

    update coupons set usage_count = usage_count + 1
      where id = v_coupon.id
        and (usage_limit is null or usage_count < usage_limit);
    get diagnostics v_usage_updated = row_count;
    if v_usage_updated <> 1 then raise exception 'Coupon is no longer available'; end if;
    v_coupon_id := v_coupon.id;
    insert into coupon_usage (coupon_id, user_id, order_id)
      values (v_coupon.id, p_user_id, v_order_id);
  end if;

  v_grand_total := greatest(v_subtotal - v_product_discount, 0) + v_delivery_fee;
  update orders
  set subtotal = v_subtotal,
      discount_amount = v_discount,
      delivery_fee = v_delivery_fee,
      grand_total = v_grand_total,
      coupon_id = v_coupon_id,
      status = 'confirmed'
  where id = v_order_id;
  insert into payments (order_id, payment_method, payment_status, amount)
    values (v_order_id, 'cod', 'pending', v_grand_total);

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'confirmation_token', v_confirmation_token,
    'subtotal', v_subtotal,
    'discount_amount', v_discount,
    'delivery_fee', v_delivery_fee,
    'grand_total', v_grand_total,
    'estimated_delivery', case p_delivery_zone
      when 'express' then '1–2 working days'
      when 'outside_dhaka' then '3–5 working days'
      else '2–4 working days'
    end
  );
end;
$$;

-- Confirmation data is readable only by the signed-in owner or by the
-- one-time-style confirmation token returned after a successful checkout.
create or replace function get_order_confirmation(
  p_order_id uuid,
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
      'guest_name', o.guest_name,
      'guest_phone', o.guest_phone,
      'subtotal', o.subtotal,
      'discount_amount', o.discount_amount,
      'delivery_fee', o.delivery_fee,
      'grand_total', o.grand_total,
      'delivery_zone', o.delivery_zone,
      'shipping_address', o.shipping_address_snapshot,
      'created_at', o.created_at
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
  where o.id = p_order_id
    and (o.confirmation_token = p_confirmation_token or o.user_id = auth.uid());
$$;

revoke all on function create_cod_order(uuid, jsonb, jsonb, text, text, text) from public;
grant execute on function create_cod_order(uuid, jsonb, jsonb, text, text, text) to anon, authenticated;
revoke all on function get_order_confirmation(uuid, text) from public;
grant execute on function get_order_confirmation(uuid, text) to anon, authenticated;