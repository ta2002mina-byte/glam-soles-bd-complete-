-- ============================================================
-- Glam Soles BD — Migration 007
-- Storage buckets & policies
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================

-- Public-read buckets for catalog/marketing images; only staff can upload.
insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('banners', 'banners', true),
  ('categories', 'categories', true)
on conflict (id) do nothing;

-- Reviews photos: public-read (so approved review images show), but
-- uploads restricted to the authenticated owner of the review.
insert into storage.buckets (id, name, public)
values ('reviews', 'reviews', true)
on conflict (id) do nothing;

-- ---------- products / banners / categories: staff-only writes ----------
create policy "catalog_images_public_read"
  on storage.objects for select
  using (bucket_id in ('products', 'banners', 'categories'));

create policy "catalog_images_staff_write"
  on storage.objects for insert
  with check (bucket_id in ('products', 'banners', 'categories') and is_staff_or_above());

create policy "catalog_images_staff_update"
  on storage.objects for update
  using (bucket_id in ('products', 'banners', 'categories') and is_staff_or_above());

create policy "catalog_images_staff_delete"
  on storage.objects for delete
  using (bucket_id in ('products', 'banners', 'categories') and is_staff_or_above());

-- ---------- reviews: public read, owner can upload to their own folder ----------
-- Convention: object path must be "<user_id>/<filename>" so ownership
-- can be checked from the path itself.
create policy "review_images_public_read"
  on storage.objects for select
  using (bucket_id = 'reviews');

create policy "review_images_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "review_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'reviews'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_staff_or_above())
  );
