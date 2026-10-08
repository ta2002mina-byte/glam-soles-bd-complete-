# Glam Soles BD — Payment Architecture

_Phase 12 deliverable. Written for engineers who will later wire up a real
payment gateway (bKash, Nagad, or a card processor). V1 launches with Cash
on Delivery only — nothing below turns on online payment; it documents the
shape that's already in place so a future gateway integration doesn't
require touching `orders`, checkout, or RLS._

## 1. Current COD flow (V1, live today)

```
Shopper reviews cart
        │
        ▼
/checkout — collects name, phone, address, delivery zone
        │  Payment section shows only:
        │  "Cash on Delivery — Pay when your order is delivered.
        │   No online payment is required."
        ▼
placeCodOrder() server action (app/actions/checkout.ts)
        │  never trusts client-submitted totals
        ▼
create_cod_order(...) — Postgres RPC, SECURITY DEFINER
  (supabase/migrations/006_secure_order_creation.sql)
        │  1. re-validates address + delivery zone
        │  2. reloads current product/variant prices from `products`/
        │     `product_variants` — ignores any price the client sent
        │  3. re-validates & re-prices the coupon, if any
        │  4. verifies stock, decrements it atomically
        │  5. inserts `orders` row → status = 'confirmed'
        │  6. inserts `order_items`
        │  7. inserts `payments` row:
        │       payment_method   = 'cod'
        │       payment_status   = 'pending'
        │       amount           = server-computed grand_total
        ▼
/order-success — shows order id, items, address, total,
                  "Cash on Delivery" as the payment method
        ▼
Courier delivers, collects cash
        ▼
mark_cod_collected(order_id) — Postgres RPC, staff/manager/admin only
        │  sets payments.payment_status = 'collected', paid_at = now()
        │  (currently invoked via direct RPC call by staff tooling;
        │   the Phase 9 admin "Mark Payment Collected" button will call
        │   the same function once the admin panel is built)
        ▼
Order status → 'delivered'
```

Idempotency: `orders.idempotency_key` is unique, so a double-submitted
checkout (double click, browser back/retry, flaky network) can't create two
orders for the same client-generated key.

## 2. `payments` table — already provider-agnostic

```sql
create table payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references orders (id) on delete cascade,
  payment_method           payment_method not null default 'cod',   -- 'cod' | 'bkash' | 'nagad' | 'card'
  payment_status           payment_status not null default 'pending', -- 'pending' | 'collected' | 'failed' | 'refunded'
  amount                   numeric(10, 2) not null,
  currency                 text not null default 'BDT',
  transaction_reference    text,   -- our own reference, shown to the customer
  provider                 text,   -- e.g. 'bkash', 'nagad', 'stripe', 'sslcommerz'
  provider_transaction_id  text,   -- the gateway's own transaction/reference id
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
```

This shape already covers every payment method in the roadmap — no new
columns, tables, or `orders` changes are needed to add bKash, Nagad, or a
card gateway later:

- `payment_method` — which rail the order intends to use.
- `provider` / `provider_transaction_id` — which gateway handled it and
  that gateway's own reference, kept separate from our internal
  `transaction_reference` so a refund/dispute lookup never depends on
  parsing a vendor-specific ID format out of a shared field.
- `payment_status` is the single field that ever changes after creation —
  `orders.status` and `payments.payment_status` are intentionally separate
  so "order delivered" and "payment settled" can move independently (this
  already matters for COD: an order can be `delivered` while
  `payment_status` briefly lags at `pending` until cash is collected and
  confirmed).

`card` is used as one payment method for card-network payments generally
(Visa, Mastercard, etc.) rather than a separate enum value per network —
the acquiring gateway (e.g. SSLCommerz, Stripe) reports the card network in
its own response, which belongs in `provider`/`provider_transaction_id`,
not in `payment_method`. This keeps the enum small and avoids a schema
change every time a new card network or wallet is supported.

**Never customer-writable.** RLS on `payments`
(`supabase/migrations/005_row_level_security.sql`):
- `insert` is blocked outright for all clients (`with check (false)`) —
  every payment row is created only by the trusted `create_cod_order`
  server-side function (and, later, a webhook handler running with the
  same trust level).
- `update` is staff/manager/admin only.
- `select` is restricted to the order's owner or staff.

A customer can never set their own `payment_status`, `amount`, or
`provider_transaction_id` — today or after a gateway is added.

## 3. Adding a real gateway later — integration points

```
Order ──▶ Payment ──▶ Payment Provider ──▶ Payment Result ──▶ Order Status
```

When bKash/Nagad/card is ready to go live, the pieces that change are:

1. **Checkout UI** (`app/checkout/page.tsx`) — add a payment-method choice
   alongside "Cash on Delivery". For an online method, redirect to (or
   embed) the provider's hosted checkout/payment flow after the order is
   created in a `pending` state, instead of showing the order-success page
   immediately.
2. **Order creation** — extend `create_cod_order` (or add a sibling
   `create_online_order` RPC) to insert a `payments` row with
   `payment_method = 'bkash' | 'nagad' | 'card'` and `payment_status =
   'pending'`, then return a redirect/session reference for the client to
   continue to the provider.
3. **Server-side verification** — a new server action or Edge Function
   that calls the provider's verify/query API using **server-only**
   credentials (never `NEXT_PUBLIC_*`), confirms the amount matches the
   order, and only then updates `payments.payment_status` and
   `orders.status`. The client is never trusted to report "payment
   succeeded" on its own — that classification always comes from the
   provider via server-to-server verification.
4. **Webhooks** — an Edge Function/route handler receiving the provider's
   webhook, verifying its signature, looking up the order by
   `provider_transaction_id`/`transaction_reference`, and updating
   `payment_status` (`collected` on success, `failed` otherwise) using the
   service-role client server-side. This runs outside the RLS policies
   above (as `create_cod_order` does today) but is still the only path
   that can move `payment_status` for an online payment.
5. **Refunds** — a staff-triggered server action (or a provider webhook,
   for gateway-initiated refunds) that calls the provider's refund API,
   then sets `payment_status = 'refunded'` and records the provider's
   refund reference in `provider_transaction_id` or
   `transaction_reference`. Never exposes refund initiation to the
   customer directly; refunds are staff/manager/admin-approved, mirroring
   the existing returns/exchanges approval flow.
6. **Credentials** — API keys/secrets for any gateway are server
   environment variables only, read in server actions/Edge Functions,
   never in a `NEXT_PUBLIC_*` variable and never sent to the browser —
   same rule already followed for the Supabase service-role key.

## 4. What NOT to do when adding a gateway

- Don't let the client set `payment_status` directly — always go through a
  server-verified path (RPC, server action, or webhook).
- Don't reuse `payment_method = 'card'` to also mean "cash" or vice versa —
  keep `amount`/`currency` sourced from the server-computed order total,
  never from a client-submitted value, exactly as `create_cod_order` does
  today.
- Don't fake a payment success state in development/staging — an
  unverified/simulated "success" must never write `payment_status =
  'collected'`.

## 5. Current V1 QA checklist (re-verified this phase)

- [x] Checkout shows only "Cash on Delivery — Pay when your order is
      delivered. No online payment is required." — no bKash/Nagad/card UI
      anywhere in the storefront.
- [x] `payments` insert is blocked for all client roles; only
      `create_cod_order`/`mark_cod_collected` (SECURITY DEFINER, staff-only
      for the latter) can write to it.
- [x] No service-role key or gateway credential appears in any client
      (`"use client"`) file or `NEXT_PUBLIC_*` variable.
- [x] `orders.status` and `payments.payment_status` flows match the spec:
      `pending → confirmed → processing → packed → shipped →
      out_for_delivery → delivered` (+ `cancelled`/`returned`), and
      `pending → collected | failed | refunded`.

## Supabase SQL required this phase: **NO**

The schema, enums, and RLS already built in Phases 2/6/7 already satisfy
Phase 12's requirements in full — this phase was a review + documentation
pass, not a schema change.
