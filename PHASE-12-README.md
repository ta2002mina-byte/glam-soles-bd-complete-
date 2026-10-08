# Glam Soles BD — Phase 12 (Future-Ready Payment Architecture)

Scope note: same as Phase 11 — Phases 9–10 (Admin Panel, CMS) are not built
in this project yet, so the admin-side "Mark Payment Collected" UI referenced
by the master spec doesn't exist. Everything below is a database/architecture
review plus documentation, which is what Phase 12 is scoped to be.

## Summary

This phase was primarily a **review**, not a build. The `payments` table,
enums, RLS policies, and order-creation RPC built in earlier phases
(2, 6, 7) already satisfy every Phase 12 requirement:

- `payments` already has exactly the required fields: `id`, `order_id`,
  `payment_method`, `payment_status`, `amount`, `currency`,
  `transaction_reference`, `provider`, `provider_transaction_id`,
  `paid_at`, `created_at`, `updated_at`.
- `payment_method` enum already covers `cod` / `bkash` / `nagad` / `card`
  (Visa & Mastercard both flow through `card`, with the specific network
  recorded in `provider`/`provider_transaction_id` — see
  `docs/PAYMENTS.md` §2 for the reasoning).
- `payment_status` enum already covers `pending` / `collected` / `failed`
  / `refunded`.
- `create_cod_order` already inserts `payment_method = 'cod'`,
  `payment_status = 'pending'`.
- `mark_cod_collected` already exists as a staff-only, SECURITY DEFINER
  function that sets `payment_status = 'collected'` — ready for the
  Phase 9 admin panel's "Mark Payment Collected" button to call.
- RLS on `payments` already blocks all client-side inserts
  (`with check (false)`), restricts updates to staff/manager/admin, and
  restricts reads to the order's owner or staff. Payment status has never
  been customer-controlled.
- No service-role key or gateway credential exists anywhere in client
  (`"use client"`) code or a `NEXT_PUBLIC_*` variable.
- Checkout shows only "Cash on Delivery — Pay when your order is
  delivered. No online payment is required." — no bKash/Nagad/card UI
  exists anywhere in the storefront.

## What this phase added

- **`docs/PAYMENTS.md`** — the developer document required by the spec:
  current COD flow end-to-end, the `payments` schema and why it's already
  provider-agnostic, the exact integration points for a future gateway
  (checkout UI, order creation, server-side verification, webhooks,
  refunds), and what not to do when wiring one up.

## Files created

- `docs/PAYMENTS.md`

## Files modified

- None — no application code changes were required.

## QA

- Confirmed (via `grep`) no `SERVICE_ROLE`/`service_role` string appears
  anywhere in `.ts`/`.tsx` application code.
- Confirmed `payments_no_direct_client_insert` RLS policy
  (`with check (false)`) blocks all client inserts.
- Confirmed `mark_cod_collected` requires `is_staff_or_above()`.
- Confirmed checkout UI contains no bKash/Nagad/Visa/Mastercard references.
- Manual review only — see Phase 11's README for the note on why
  `npm run typecheck`/`lint`/`build` couldn't be run in this sandbox
  (no network access to install dependencies). No code was changed this
  phase beyond adding a markdown file, so this is lower-risk than Phase 11,
  but please still run the full check locally before considering V1
  launch-ready.

## Supabase SQL required: NO

Every requirement in the Phase 12 spec was already satisfied by the schema,
enums, RPCs and RLS from earlier phases. No migration was needed.

---

This completes the phased build for the scope covered so far (Phases 1–8
storefront + Phase 11 polish + Phase 12 payment architecture review).
**Phases 9 and 10 (Admin Panel Core, and CMS/Returns/Analytics/
Permissions) still remain unbuilt** — `/admin` is an empty route. The
master spec's Phase 12 "Final QA" item "admin COD collection works" can't
be verified until that admin panel exists.
