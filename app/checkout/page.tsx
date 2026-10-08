"use client";

import Link from "next/link";
import { ArrowLeft, Check, LockKeyhole, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { placeCodOrder } from "@/app/actions/checkout";
import { applyCouponPreview, fetchShippingSettings } from "@/app/actions/coupon";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CheckoutAddress, CouponPreview, DeliveryZone, ShippingSettingsPreview } from "@/types";
import { cn, formatBDT } from "@/lib/utils";

const initialAddress: CheckoutAddress = {
  fullName: "",
  phone: "",
  email: "",
  division: "",
  district: "",
  area: "",
  fullAddress: "",
  deliveryNote: "",
};

const inputFields: { key: keyof CheckoutAddress; label: string; placeholder: string; required?: boolean }[] = [
  { key: "fullName", label: "Full name", placeholder: "Your name", required: true },
  { key: "phone", label: "Phone number", placeholder: "01XXXXXXXXX", required: true },
  { key: "email", label: "Email (optional)", placeholder: "you@example.com" },
  { key: "division", label: "Division", placeholder: "e.g. Dhaka", required: true },
  { key: "district", label: "District", placeholder: "e.g. Dhaka", required: true },
  { key: "area", label: "Area / Thana", placeholder: "e.g. Dhanmondi", required: true },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clearCart } = useCart();
  const [address, setAddress] = useState<CheckoutAddress>(initialAddress);
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone>("inside_dhaka");
  const [shipping, setShipping] = useState<ShippingSettingsPreview | null>(null);
  const [couponCode, setCouponCode] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("glam-soles-bd:checkout-coupon") ?? ""
  );
  const [coupon, setCoupon] = useState<Extract<CouponPreview, { status: "valid" }> | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    void fetchShippingSettings().then(setShipping);
  }, []);

  const deliveryFee = useMemo(() => {
    if (!shipping) return 0;
    if (shipping.freeShippingThreshold !== null && subtotal >= shipping.freeShippingThreshold) return 0;
    return deliveryZone === "outside_dhaka"
      ? shipping.outsideDhakaFee
      : deliveryZone === "express"
        ? shipping.expressFee
        : shipping.insideDhakaFee;
  }, [deliveryZone, shipping, subtotal]);
  const discountAmount = coupon?.type === "free_delivery" ? deliveryFee : coupon?.discountAmount ?? 0;
  const summaryTotal = Math.max(subtotal - (coupon?.type === "free_delivery" ? 0 : discountAmount), 0) + (coupon?.type === "free_delivery" ? 0 : deliveryFee);

  function updateAddress(key: keyof CheckoutAddress, value: string) {
    setAddress((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  }

  async function previewCheckoutCoupon() {
    if (!couponCode.trim()) {
      setCoupon(null);
      setCouponError(null);
      return;
    }
    const result = await applyCouponPreview(
      couponCode,
      lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }))
    );
    if (result.status === "valid") {
      setCoupon(result);
      setCouponError(null);
    } else {
      setCoupon(null);
      setCouponError(result.message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPlacing) return;
    setError(null);
    setIsPlacing(true);

    const idempotencyKey =
      sessionStorage.getItem("glam-soles-bd:checkout-idempotency") ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem("glam-soles-bd:checkout-idempotency", idempotencyKey);

    const result = await placeCodOrder({
      address,
      deliveryZone,
      couponCode: couponCode || undefined,
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      idempotencyKey,
    });

    if (result.status === "error") {
      setError(result.message);
      setIsPlacing(false);
      return;
    }

    await clearCart();
    sessionStorage.removeItem("glam-soles-bd:checkout-coupon");
    sessionStorage.removeItem("glam-soles-bd:checkout-idempotency");
    router.replace(
      `/order-success?order=${encodeURIComponent(result.orderId)}&token=${encodeURIComponent(result.confirmationToken)}`
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-boutique py-16">
        <div className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-line bg-soft-white p-8 text-center">
          <ShoppingBag className="mx-auto text-gold" size={30} />
          <h1 className="mt-4 text-2xl text-charcoal">Your bag is waiting for something fabulous.</h1>
          <p className="mt-2 text-sm text-charcoal-soft">Add a pair before heading to checkout.</p>
          <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-pill)] bg-charcoal px-6 text-sm font-medium text-soft-white">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-boutique py-8 md:py-12">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-charcoal-soft hover:text-charcoal">
        <ArrowLeft size={16} /> Back to bag
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Checkout</p>
            <h1 className="mt-2 text-3xl text-charcoal md:text-4xl">Make it yours.</h1>
            <p className="mt-2 text-sm text-charcoal-soft">We’ll confirm your order before it ships.</p>
          </div>

          <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5 md:p-6">
            <h2 className="text-xl text-charcoal">Contact & delivery address</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {inputFields.map((field) => (
                <label key={field.key} className={cn("text-sm text-charcoal-soft", field.key === "email" && "sm:col-span-2")}>
                  <span>{field.label}{field.required && <span className="ml-1 text-gold">*</span>}</span>
                  <Input
                    className="mt-2"
                    type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                    value={address[field.key] ?? ""}
                    onChange={(event) => updateAddress(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    autoComplete={field.key === "fullName" ? "name" : field.key === "phone" ? "tel" : field.key === "email" ? "email" : "off"}
                  />
                </label>
              ))}
              <label className="text-sm text-charcoal-soft sm:col-span-2">
                <span>Full address <span className="ml-1 text-gold">*</span></span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-lg border border-line bg-soft-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  value={address.fullAddress}
                  onChange={(event) => updateAddress("fullAddress", event.target.value)}
                  placeholder="House / road / landmark"
                  required
                />
              </label>
              <label className="text-sm text-charcoal-soft sm:col-span-2">
                <span>Delivery note (optional)</span>
                <textarea
                  className="mt-2 min-h-20 w-full resize-y rounded-lg border border-line bg-soft-white px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  value={address.deliveryNote}
                  onChange={(event) => updateAddress("deliveryNote", event.target.value)}
                  placeholder="Any helpful instruction for the rider?"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5 md:p-6">
            <h2 className="text-xl text-charcoal">Delivery option</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {([
                ["inside_dhaka", "Inside Dhaka", shipping?.insideDhakaFee],
                ["outside_dhaka", "Outside Dhaka", shipping?.outsideDhakaFee],
                ["express", "Express", shipping?.expressFee],
              ] as const).map(([value, label, fee]) => {
                const disabled = value === "express" && !shipping?.expressEnabled;
                return (
                  <label key={value} className={cn("cursor-pointer rounded-xl border p-4 transition-colors", deliveryZone === value ? "border-gold bg-cream" : "border-line", disabled && "cursor-not-allowed opacity-50")}>
                    <input
                      type="radio"
                      name="delivery-zone"
                      value={value}
                      checked={deliveryZone === value}
                      onChange={() => setDeliveryZone(value)}
                      disabled={disabled}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between gap-2 text-sm font-medium text-charcoal">
                      {label}
                      {deliveryZone === value && <Check size={16} className="text-gold" />}
                    </span>
                    <span className="mt-1 block text-xs text-charcoal-soft">
                      {disabled ? "Currently unavailable" : fee === undefined ? "Checking fee…" : fee === 0 ? "Free" : formatBDT(fee)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5 md:p-6">
            <h2 className="text-xl text-charcoal">Payment</h2>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-gold bg-cream p-4">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-soft-white"><Check size={13} /></span>
              <div>
                <p className="text-sm font-semibold text-charcoal">Cash on Delivery</p>
                <p className="mt-1 text-xs text-charcoal-soft">Pay when your order is delivered. No online payment is required.</p>
              </div>
            </div>
          </section>
        </form>

        <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-soft-white p-5 lg:sticky lg:top-24">
          <h2 className="text-xl text-charcoal">Order summary</h2>
          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <div key={line.variantId} className="flex justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-charcoal">{line.name}</p>
                  <p className="mt-1 text-xs text-charcoal-soft">{line.color} · {line.size} · Qty {line.quantity}</p>
                </div>
                <span className="shrink-0 text-charcoal">{formatBDT(line.unitPrice * line.quantity)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-charcoal-soft">Subtotal</dt><dd>{formatBDT(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal-soft">Delivery</dt><dd>{shipping ? coupon?.type === "free_delivery" || deliveryFee === 0 ? "Free" : formatBDT(deliveryFee) : "Checking…"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatBDT(summaryTotal)}</dd></div>
          </dl>
          <label className="mt-4 block text-xs text-charcoal-soft">
            Coupon code (optional)
            <Input
              className="mt-2 h-10 text-sm uppercase"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setCoupon(null);
                setCouponError(null);
              }}
              onBlur={() => void previewCheckoutCoupon()}
              placeholder="Enter code"
              maxLength={50}
            />
          </label>
          {coupon && <p className="mt-2 text-xs text-gold">Coupon applied — saving {formatBDT(coupon.discountAmount)}.</p>}
          {couponError && <p role="status" className="mt-2 text-xs text-charcoal-soft">{couponError}</p>}
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-charcoal-soft">Discount</span>
            <span className={discountAmount > 0 ? "text-gold" : "text-charcoal"}>{discountAmount > 0 ? `−${formatBDT(discountAmount)}` : "—"}</span>
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-blush/50 px-3 py-2 text-sm text-charcoal">{error}</p>}
          <Button type="submit" form="checkout-form" size="lg" className="mt-5 w-full" disabled={isPlacing || !shipping}>
            {isPlacing ? "Placing your order…" : "Place COD order"}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-charcoal-soft"><LockKeyhole size={13} /> Secure checkout · Your total is verified securely</p>
        </aside>
      </div>
    </div>
  );
}