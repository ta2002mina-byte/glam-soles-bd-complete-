-- ============================================================
-- Glam Soles BD — Migration 010
-- Extend banners.placement to support the announcement bar
-- ============================================================
-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR
-- ============================================================
-- migrations/004 created `banners` with placement in
-- ('hero','category','promo','homepage_section'). Phase 3 requires the
-- announcement bar to also be admin-editable through this same CMS table,
-- so this adds 'announcement' as a valid placement without touching the
-- already-applied 004 migration. Safe to re-run.
-- ============================================================

alter table banners drop constraint if exists banners_placement_check;

alter table banners add constraint banners_placement_check
  check (placement in ('hero', 'category', 'promo', 'homepage_section', 'announcement'));
