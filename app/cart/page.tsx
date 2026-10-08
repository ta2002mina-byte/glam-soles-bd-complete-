"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { CartLineRow } from "@/components/cart/cart-line-row";
import { CouponForm } from "@/components/cart/coupon-form";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { revalidateCart } from "@/app/actions/cart";
import { applyCouponPreview, fetchShippingSettings } from "@/app/actions/coupon";
import type { CartLineValidation, CouponPreview, ShippingSettingsPreview } from "@/types";
import { cn, formatBDT } from "@/lib/utils";

export default function CartPage() {
  const { lines, subtotal, removeLine, setQuantity } = useCart();
  const { toggle: toggleWishlist } = useWishlist();

  const [validations, setValidations] = useState<Map<string, CartLineValidation>>(new Map());
  const [isValidating, setIsValidating] = useState(true);
  const [shipping, setShipping] = useState<ShippingSettingsPreview | null>(null);
  const [coupon, setCoupon] = useState<Extract<CouponPreview, { status: "valid" }> | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // A stable fingerprint of what's actually in the cart, so we only
  // re-validate against the database when the contents genuinely change.
  const itemsKey = useMemo(
    () => lines.map((l) => `${l.variantId}:${l.quantity}`).join(","),
    [lines]
  );
  const clampedOnceRef = useRef<Set<string>>(new Set());

  const runValidation = useCallback(async () => {
    if (lines.length === 0) {
      setValidations(new Map());
      setIsValidating(false);
      return;
    }
    setIsValidating(true);
    const results = await revalidateCart(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));
    const map = new Map(results.map((r) => [r.variantId, r]));
    setValidations(map);
    setIsValidating(false);

    // Auto-clamp any line that's asking for more than is actually in
    // stock right now — never let a shopper check out with a quantity the
    // database can't honor. Only do this once per mismatch we've already
    // surfaced, so it doesn't fight the shopper's own quantity clicks.
    for (const line of lines) {
      const v = map.get(line.variantId);
      if (!v) continue;
      const key = `${line.variantId}:${line.quantity}`;
      if (v.valid && v.adjustedQuantity !== line.quantity && !clampedOnceRef.current.has(key)) {
        clampedOnceRef.current.add(key);
        setQuantity(line.variantId, v.adjustedQuantity);
      }
    }
  }, [lines, setQuantity]);

  useEffect(() => {
    const timer = window.setTimeout(() => void runValidation(), 0);
    return () => window.clearTimeout(timer);
  }, [itemsKey, runValidation]);

  useEffect(() => {
    fetchShippingSettings().then(setShipping);
  }, []);

  // Re-check an already-applied coupon whenever the bag changes (e.g. the
  // shopper removed the item that made a category coupon eligible).
  useEffect(() => {
    if (!coupon) return;
    sessionStorage.setItem("glam-soles-bd:checkout-coupon", coupon.code);
    applyCouponPreview(
      coupon.code,
      lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))
    ).then((result) => {
      if (result.status === "valid") setCoupon(result);
      else {
        setCoupon(null);
        sessionStorage.removeItem("glam-soles-bd:checkout-coupon");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  useEffect(() => {
    if (!coupon) sessionStorage.removeItem("glam-soles-bd:checkout-coupon");
  }, [coupon]);

  function handleSaveForLater(productId: string, variantId: string, name: string) {
    toggleWishlist(productId);
    removeLine(variantId);
    setSavedMessage(`${name} moved to your Wishlist.`);
    window.setTimeout(() => setSavedMessage(null), 3500);
  }

  if (lines.length === 0) {
    return (
      <div className="container-boutique py-16">
        <EmptyState
          title="Your bag is waiting for something fabulous."
          action={
            <Link href="/" className={buttonVariants({ size: "md" })}>
              Continue Shopping
            </Link>
          }
        />
      </div>
    );
  }

  const invalidCount = Array.from(validations.values()).filter((v) => !v.valid || v.outOfStock).length;
  const insideDhakaFee = shipping?.insideDhakaFee ?? 0;
  const freeShippingThreshold = shipping?.freeShippingThreshold ?? null;
  const qualifiesForFreeShipping = freeShippingThreshold !== null && subtotal >= freeShippingThreshold;
  const deliveryFee = qualifiesForFreeShipping ? 0 : insideDhakaFee;
  const discountAmount = coupon?.discountAmount ?? 0;
  const grandTotal = Math.max(subtotal - discountAmount, 0) + (coupon?.type === "free_delivery" ? 0 : deliveryFee);

  return (
    <div className="container-boutique py-8 md:py-12">
      <h1 className="font-display text-2xl text-charcoal md:text-3xl">Your Bag</h1>

      {savedMessage && (
        <p role="status" className="mt-3 rounded-lg bg-blush/50 px-4 py-2 text-sm text-charcoal">
          {savedMessage}
        </p>
      )}

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {invalidCount > 0 && (
            <p role="alert" className="mb-4 rounded-lg bg-blush/50 px-4 py-2 text-sm text-charcoal">
              {invalidCount === 1
                ? "One item in your bag needs attention — see below."
                : `${invalidCount} items in your bag need attention — see below.`}
            </p>
          )}

          {lines.map((line) => {
            const v = validations.get(line.variantId);
            let warning: string | undefined;
            if (v) {
              if (!v.valid) warning = "This item is no longer available.";
              else if (v.outOfStock) warning = "Currently unavailable";
              else if (v.currentStock <= 5 && v.currentStock > 0) warning = `Only ${v.currentStock} left in stock`;
              if (v.valid && v.currentPrice !== line.unitPrice) {
                warning = warning
                  ? `${warning} · Price updated to ${formatBDT(v.currentPrice)}`
                  : `Price updated to ${formatBDT(v.currentPrice)}`;
              }
            }

            return (
              <CartLineRow
                key={line.variantId}
                line={v && v.valid && v.currentPrice !== line.unitPrice ? { ...line, unitPrice: v.currentPrice } : line}
                maxQuantity={v?.valid ? Math.max(v.currentStock, 0) : line.quantity}
                warning={isValidating ? undefined : warning}
                onQuantityChange={(q) => setQuantity(line.variantId, q)}
                onRemove={() => removeLine(line.variantId)}
                onSaveForLater={() => handleSaveForLater(line.productId, line.variantId, line.name)}
              />
            );
          })}
        </div>

        <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
          <h2 className="font-display text-lg text-charcoal">Order Summary</h2>

          <div className="mt-4">
            <CouponForm
              items={lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))}
              appliedCode={coupon?.code}
              onApplied={setCoupon}
              onCleared={() => setCoupon(null)}
            />
          </div>

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal-soft">Subtotal</dt>
              <dd className="text-charcoal">{formatBDT(subtotal)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Discount</dt>
                <dd className="text-gold">−{formatBDT(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-charcoal-soft">Delivery</dt>
              <dd className="text-charcoal">
                {shipping === null ? (
                  <Skeleton className="h-4 w-12" />
                ) : coupon?.type === "free_delivery" || qualifiesForFreeShipping ? (
                  "Free"
                ) : (
                  formatBDT(deliveryFee)
                )}
              </dd>
            </div>
            <p className="text-xs text-charcoal-soft/70">
              Estimated for delivery inside Dhaka — confirmed at checkout based on your address.
            </p>
            <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
              <dt className="text-charcoal">Total</dt>
              <dd className="text-charcoal">{formatBDT(grandTotal)}</dd>
            </div>
          </dl>

          <Link
            href="/checkout"
            className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full", invalidCount > 0 && "pointer-events-none opacity-50")}
            aria-disabled={invalidCount > 0}
          >
            <ShoppingBag size={18} /> Checkout
          </Link>
          {invalidCount > 0 && (
            <p className="mt-2 text-center text-xs text-charcoal-soft">
              Remove or update the flagged items to continue.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
