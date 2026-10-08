# Glam Soles BD — Phase 7

Phase 7 adds a Cash on Delivery checkout and order confirmation flow on top of
the Phase 6 wishlist/cart build.

## Included

- `/checkout` with contact, Bangladesh delivery address, delivery zone and COD-only payment selection.
- Guest and authenticated checkout. The browser submits variant IDs and quantities only.
- `placeCodOrder` server action with input validation, retry-safe idempotency and authenticated-user binding.
- `create_cod_order` Supabase RPC that recalculates price, coupon, delivery fee, total and stock atomically.
- Express delivery is shown only when `shipping_settings.express_enabled` is true.
- `/order-success` with order number, customer phone, address, items, COD payment and final server totals.
- Confirmation-token access for guest orders and owner-only access for authenticated orders.
- Safe authenticated cart clearing only after the order RPC succeeds.
- Exact failed-order message: `Something went wrong. Please try again.`

## Supabase setup

The Phase 7 migration has not been executed from this workspace.

### 🔴 SUPABASE SQL COMMAND — RUN IN SUPABASE SQL EDITOR

Run this file after migrations `001` through `011`:

```text
supabase/migrations/012_phase7_cod_checkout.sql
```

It adds the order address snapshot/delivery fields, permits guest coupon-use
records, creates the atomic `create_cod_order` RPC, creates the protected
`get_order_confirmation` RPC, and grants only `anon`/`authenticated` execute
access. It does not enable online payments.

The shipping settings row remains the source of truth for inside-Dhaka,
outside-Dhaka, express and free-shipping behavior. Configure those values in
Supabase before testing checkout.

## Verification

- `npm run typecheck` — passed
- `npm run lint` — passed
- `npx next build --webpack` — passed
- `next build` with the default Turbopack worker was killed by the sandbox memory
  limit before compilation completed; webpack production build completed successfully.

## Manual test path

1. Apply migrations `001`–`012`.
2. Add at least one published product with a stocked variant.
3. Confirm `shipping_settings.id = 1` has the intended fees.
4. Add the variant to the cart and open `/checkout`.
5. Place a COD order as a guest.
6. Repeat the same browser submission/network retry and confirm the same order is returned, not a second order.
7. Change a product price or stock immediately before submitting and confirm the server rejects or recalculates it.