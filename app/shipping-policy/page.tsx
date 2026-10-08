import type { Metadata } from "next";
import { formatBDT } from "@/lib/utils";
import { getShippingSettings } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Delivery areas, fees and estimated delivery times for Glam Soles BD orders.",
  alternates: { canonical: "/shipping-policy" },
};

export default async function ShippingPolicyPage() {
  const shipping = await getShippingSettings();

  return (
    <div className="container-boutique py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-charcoal">Shipping Policy</h1>
        <p className="mt-3 text-sm text-charcoal-soft">
          We currently deliver across Bangladesh with Cash on Delivery. Delivery fees are calculated
          automatically at checkout based on your address — here&apos;s what to expect.
        </p>

        <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
          <div className="flex items-center justify-between p-5">
            <span className="text-sm text-charcoal">Inside Dhaka</span>
            <span className="text-sm font-medium text-charcoal">{formatBDT(shipping.insideDhakaFee)}</span>
          </div>
          <div className="flex items-center justify-between p-5">
            <span className="text-sm text-charcoal">Outside Dhaka</span>
            <span className="text-sm font-medium text-charcoal">{formatBDT(shipping.outsideDhakaFee)}</span>
          </div>
          {shipping.expressEnabled && (
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-charcoal">Express Delivery</span>
              <span className="text-sm font-medium text-charcoal">{formatBDT(shipping.expressFee)}</span>
            </div>
          )}
          {shipping.freeShippingThreshold && (
            <div className="flex items-center justify-between p-5">
              <span className="text-sm text-charcoal">Free shipping</span>
              <span className="text-sm font-medium text-charcoal">
                On orders over {formatBDT(shipping.freeShippingThreshold)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-charcoal-soft">
          <p>
            Orders are typically confirmed within a few hours and shipped within 1–2 business days.
            Delivery inside Dhaka usually takes 1–3 days; outside Dhaka may take 3–7 days depending on
            your area.
          </p>
          <p>
            Payment is Cash on Delivery — you pay when your order arrives. You can track any order at
            any time from{" "}
            <a href="/track-order" className="underline underline-offset-2">
              Track Order
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
