# Glam Soles BD — Complete Merged Build (Phases 1–12)

This package merges every phase you uploaded into **one working codebase**.
Read this file before doing anything else.

## Why a merge was needed

Your uploaded zips had split into two branches after Phase 7, each built
independently and unaware of the other:

- **Branch A** — Phase 1–8 + **Phase 10** (CMS/banners/shipping/returns/
  analytics admin), built *without* Phase 9 ever existing.
- **Branch B** — Phase 1–8 + **Phase 11** (SEO/performance, real search,
  About/Contact/Shipping-policy pages) + **Phase 12** (payment docs),
  explicitly skipping Phases 9 and 10.
- Neither branch had the **Phase 9 admin core** (Dashboard, Products,
  Orders, Customers, Inventory, admin login) — that only existed in the
  separate Phase 9 package I built for you previously.

This package is Branch B (the more complete storefront) with Phase 9 and
Phase 10 merged on top, all pointed at one shared admin login/shell, with
every naming conflict between the two admin implementations resolved.

## 🔴 SUPABASE SQL — run these, in this order

If this is a fresh Supabase project, run **all 15 files** in
`supabase/migrations/`, in filename order, in Supabase Dashboard → SQL
Editor → New query → Run:

```
001_core_enums_profiles_categories.sql
002_products_variants_inventory.sql
003_cart_wishlist_orders_payments.sql
004_reviews_rewards_notifications_returns_cms.sql
005_row_level_security.sql
006_secure_order_creation.sql
007_storage_buckets_policies.sql
008_seed_base_categories.sql
009_best_selling_products_rpc.sql
010_banner_announcement_placement.sql
011_product_details_phase5.sql
012_phase7_cod_checkout.sql
013_phase8_account_order_tracking.sql
014_admin_panel_phase9.sql   ← new
015_phase10_cms_analytics.sql ← new
```

If you already ran 001–013 against your project from earlier phases, you
only need to run the last two:

```
014_admin_panel_phase9.sql
015_phase10_cms_analytics.sql
```

**What 014 does:** adds `products.weight_grams`; a trigger that makes
`profiles.role` changes admin-only (closes a privilege-escalation gap —
previously any Manager could rewrite any profile column, including their
own role); a trigger restricting payment refunds to Manager/Admin;
tightens catalog-image storage uploads from "any staff" to "manager or
above"; adds the `admin_dashboard_summary`/`admin_dashboard_series` RPCs
the Dashboard charts use.

**What 015 does:** creates `testimonials`, `featured_products`, and
`homepage_sections` tables (with RLS mirroring the existing
banners/promotions pattern) for the Homepage CMS. Returns, Banners,
Shipping, and Analytics needed no schema changes — they reuse tables that
already existed.

Both files start with `-- 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL
EDITOR` and are idempotent (`create table if not exists`, `create or
replace`) — safe to re-run if you're not sure whether they were applied.

## Create your first admin user

There's no way to promote yourself through the UI on day one:

1. Supabase Dashboard → Authentication → Add user (email + password).
2. SQL Editor: `update profiles set role = 'admin' where id = '<user-id-from-step-1>';`
3. Sign in at `/admin/login`. From there, promote other staff from
   `/admin/customers/[id]` (role changes are admin-only, enforced in the
   UI, the server action, and a database trigger).

## What's in the admin panel now

One shell, one login, one nav — Phase 9's core plus Phase 10's CMS:

| Route | Min role | Source |
|---|---|---|
| `/admin` | Staff | Phase 9 — dashboard: revenue, orders, customers, low stock, returns, refunds; Today/7D/30D/3M/1Y charts |
| `/admin/products` (+ new/[id]) | Manager | Phase 9 — full product + variant/inventory editor, image upload |
| `/admin/inventory` | Manager | Phase 9 — stock/sold/low-stock across all variants |
| `/admin/orders` (+ [id]) | Staff | Phase 9 — status progression, COD "Mark Collected", courier/tracking |
| `/admin/customers` (+ [id]) | Manager (role change: Admin only) | Phase 9 |
| `/admin/returns` | Staff | Phase 10 — approve/reject/exchange/refund return requests |
| `/admin/cms` | Manager | Phase 10 — homepage section visibility, featured products, testimonials |
| `/admin/banners` | Manager | Phase 10 — hero/category/promo/announcement banners with scheduling |
| `/admin/shipping` | Manager | Phase 10 — delivery fees, free-shipping threshold |
| `/admin/analytics` | Manager | Phase 10 — revenue, AOV, cancellation/return/COD-collection rates |

Permissions are enforced three ways everywhere: the nav only shows what a
role can use, every page/action re-checks the role server-side, and
Postgres RLS (plus the two new guard triggers) is the final authority
regardless of what the app layer does.

## What I changed while merging (beyond copying files)

- **Renumbered migrations.** Both branches had independently authored a
  `013_*.sql`. Kept Branch B's as `013_phase8_...`; renumbered Phase 9's
  to `014` and Phase 10's to `015`.
- **One login, one guard.** Phase 10's pages used to redirect signed-out
  visitors to `/` (no login page existed yet). They now redirect to
  `/admin/login`, and check `account_status = 'active'` like Phase 9's
  guard does, so a suspended staff account is locked out consistently
  everywhere.
- **One nav.** Phase 10's own sidebar (which only listed its own 5 pages,
  by design, since Phase 9 didn't exist yet) is retired; its links were
  merged into Phase 9's sidebar/mobile-drawer component.
- **Renamed a type collision.** Both branches independently defined
  `AdminActionResult` with different shapes (`{status:"success"}` vs
  `{status:"ok"}`). Rather than force one shape onto code that already
  checks the other, Phase 10's stays as `CmsActionResult`.
- **Reused an existing RPC instead of duplicating logic.** Marking a COD
  payment "Collected" now calls the `mark_cod_collected` database function
  (already existed since Phase 2/6 — it atomically sets the payment
  collected *and* advances the order to Delivered) instead of a raw
  `update` — one less place for that logic to drift.
- **Added courier/tracking-number fields** to the order detail screen —
  the columns existed (Phase 8 added them for the customer tracking page)
  but no admin UI set them until now.
- **Added the 3 missing UI primitives** (`select`, `switch`, `textarea`)
  Phase 10's CMS components needed but weren't in Branch B.
- **Fixed two unrelated bugs** found while getting the project to a clean
  build: a TypeScript narrowing issue in the customer sign-in form
  (`account-auth-gate.tsx`), and a React "setState during render" warning
  in the track-order auto-search effect.

## QA — actually run, not just reviewed

- `npx tsc --noEmit` — **clean**, zero errors.
- `npx eslint .` — **clean**, zero errors/warnings.
- `npm run build` — **succeeds**. All 45 routes compile, including the
  new filter/sort/search-autocomplete system; every route that reads
  cookies or searchParams (admin, account, cart, checkout, the category
  pages, /search) is correctly dynamic (`ƒ`), `/robots.txt` and
  `/sitemap.xml` are static. (In this sandbox the build only fails on the
  pre-existing Phase 1 Google Fonts fetch, which needs outbound internet
  this sandbox doesn't have — confirmed unrelated by temporarily stubbing
  the font import and re-running successfully. On your machine, with
  normal internet access, this isn't an issue.)
- Not runnable here: a live Supabase project (so RLS/trigger behavior,
  real sign-in, and storage uploads still need a real run-through), and a
  Lighthouse/responsive pass in a browser.

## Known gap — flagged in the previous build, now closed

**Phase 4 (category filters, sorting, quick view, search autocomplete)
is now built.** What's in this package:

- **Filters** on `/women`, `/men`, `/kids`, `/accessories`: subcategory,
  brand, size, color, price range, on-sale, in-stock, rating. Desktop
  sidebar + mobile drawer, both URL-driven (`?subcategory=heels&size=38&color=black&price_min=1000&...`)
  so results are shareable and back/forward-button-safe.
- **Sorting**: Recommended, Newest, Best Selling (reuses the existing
  `get_best_selling_products` RPC), Price Low→High, Price High→Low,
  Highest Rated.
- **Pagination**: numbered Previous/Next, preserving every active
  filter/sort param.
- **Quick View**: opens instantly from any product card (reuses the
  already-fetched listing data, no extra request) with color/size
  selection and Add to Cart, no page reload.
- **Search autocomplete**: debounced (300ms) dropdown with product
  thumbnails, category and brand matches, recent searches (localStorage)
  and popular searches — in the header (desktop: click the search icon;
  mobile: the bottom-nav Search tab opens the full `/search` page) and
  on `/search` itself.
- **Fixed a real pre-existing bug** while building this: the header's
  "New Arrivals", "Best Sellers", and "Sale" links pointed at
  `/search?sort=newest` etc., but `/search` silently ignored every param
  except `q` — clicking them showed an empty "what are you looking for"
  screen. They now work.

Design note on how filtering queries the database: category/brand/
published/active filters run in Postgres; color/size/price/discount/
rating filtering and sorting run over that already-scoped candidate set
(capped at 500 products) in one round trip. For a boutique catalog this
is simpler and just as fast as expressing "has a variant matching every
selected size AND every selected color" as a single database filter
string — documented in `getProductListing()` in
`lib/supabase/queries.ts` if you want the full reasoning or need to
raise the cap later.

## Other pre-existing placeholders worth knowing about

- Support phone/WhatsApp/Messenger numbers in `lib/site-config.ts` are
  placeholders from Phase 11 — swap in your real contact details before
  launch.
- `docs/PAYMENTS.md` (Phase 12) documents how to wire up a real payment
  gateway later; V1 is Cash on Delivery only, as specified.
