-- ============================================================
-- Glam Soles BD — Migration 008
-- Seed base storefront categories (structure only — NOT products)
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================
-- This seeds the four top-level categories the homepage and nav
-- link to (/women, /men, /kids, /accessories) plus their
-- documented subcategories. This is category STRUCTURE only —
-- no products, no fake inventory, no fake prices are created.
-- Safe to re-run: uses ON CONFLICT (slug) DO NOTHING.
-- ============================================================

insert into categories (name, slug, sort_order, is_active) values
  ('Women', 'women', 1, true),
  ('Men', 'men', 2, true),
  ('Kids', 'kids', 3, true),
  ('Accessories', 'accessories', 4, true)
on conflict (slug) do nothing;

-- ---------- Women subcategories ----------
insert into categories (parent_id, name, slug, sort_order, is_active)
select c.id, sub.name, sub.slug, sub.sort_order, true
from categories c
cross join (values
  ('Heels', 'women-heels', 1),
  ('Flats', 'women-flats', 2),
  ('Sandals', 'women-sandals', 3),
  ('Sneakers', 'women-sneakers', 4),
  ('Loafers', 'women-loafers', 5),
  ('Boots', 'women-boots', 6)
) as sub(name, slug, sort_order)
where c.slug = 'women'
on conflict (slug) do nothing;

-- ---------- Men subcategories ----------
insert into categories (parent_id, name, slug, sort_order, is_active)
select c.id, sub.name, sub.slug, sub.sort_order, true
from categories c
cross join (values
  ('Sneakers', 'men-sneakers', 1),
  ('Formal Shoes', 'men-formal-shoes', 2),
  ('Loafers', 'men-loafers', 3),
  ('Sandals', 'men-sandals', 4),
  ('Boots', 'men-boots', 5)
) as sub(name, slug, sort_order)
where c.slug = 'men'
on conflict (slug) do nothing;

-- ---------- Kids subcategories ----------
insert into categories (parent_id, name, slug, sort_order, is_active)
select c.id, sub.name, sub.slug, sub.sort_order, true
from categories c
cross join (values
  ('Girls', 'kids-girls', 1),
  ('Boys', 'kids-boys', 2),
  ('School Shoes', 'kids-school-shoes', 3),
  ('Sneakers', 'kids-sneakers', 4),
  ('Sandals', 'kids-sandals', 5)
) as sub(name, slug, sort_order)
where c.slug = 'kids'
on conflict (slug) do nothing;

-- ---------- Accessories subcategories ----------
insert into categories (parent_id, name, slug, sort_order, is_active)
select c.id, sub.name, sub.slug, sub.sort_order, true
from categories c
cross join (values
  ('Bags', 'accessories-bags', 1),
  ('Wallets', 'accessories-wallets', 2),
  ('Belts', 'accessories-belts', 3),
  ('Other Accessories', 'accessories-other', 4)
) as sub(name, slug, sort_order)
where c.slug = 'accessories'
on conflict (slug) do nothing;
