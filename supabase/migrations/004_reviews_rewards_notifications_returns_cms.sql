-- ============================================================
-- Glam Soles BD — Migration 004
-- Reviews, Rewards, Notifications, Returns/Exchanges, CMS (Banners/Promotions)
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- ---------- Reviews ----------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  order_item_id uuid references order_items (id),
  rating integer not null check (rating between 1 and 5),
  body text,
  size_feedback text,
  photo_urls text[],
  is_verified_purchase boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_product on reviews (product_id);
create index if not exists idx_reviews_approved on reviews (is_approved) where is_approved = true;

-- A review can only be marked verified if it is tied to a real delivered order item
-- belonging to that same user — enforced server-side via this function, not the client.
create or replace function mark_review_verified_if_eligible()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_eligible boolean;
begin
  if new.order_item_id is not null then
    select exists (
      select 1
      from order_items oi
      join orders o on o.id = oi.order_id
      where oi.id = new.order_item_id
        and o.user_id = new.user_id
        and o.status = 'delivered'
    ) into v_eligible;
    new.is_verified_purchase := v_eligible;
  else
    new.is_verified_purchase := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_verify on reviews;
create trigger trg_reviews_verify
  before insert on reviews
  for each row execute function mark_review_verified_if_eligible();

-- ---------- Rewards ----------
create table if not exists reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references orders (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_tx_user on reward_transactions (user_id);

create or replace function award_reward_points(p_user_id uuid, p_points integer, p_reason text, p_order_id uuid default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into reward_transactions (user_id, points, reason, order_id)
  values (p_user_id, p_points, p_reason, p_order_id);

  update profiles
  set reward_points = reward_points + p_points
  where id = p_user_id;
end;
$$;

-- ---------- Notifications ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in (
    'order', 'shipping', 'delivery', 'price_drop', 'back_in_stock',
    'new_collection', 'coupon', 'reward', 'promotion'
  )),
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications (user_id, is_read);

-- ---------- Returns & Exchanges ----------
create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  order_item_id uuid not null references order_items (id),
  user_id uuid not null references profiles (id),
  reason return_reason not null,
  description text,
  photo_url text,
  status return_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_returns_user on returns (user_id);
create index if not exists idx_returns_order on returns (order_id);

drop trigger if exists trg_returns_updated_at on returns;
create trigger trg_returns_updated_at
  before update on returns
  for each row execute function set_updated_at();

-- ---------- CMS: Banners & Promotions ----------
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('hero', 'category', 'promo', 'homepage_section')),
  title text,
  subtitle text,
  desktop_image_url text,
  mobile_image_url text,
  cta_text text,
  cta_link text,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_banners_placement on banners (placement) where is_active = true;

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  banner_id uuid references banners (id),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Newsletter subscribers ----------
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now()
);
