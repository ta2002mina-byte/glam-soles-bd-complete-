import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/account/track-order-form";

export const metadata: Metadata = {
  title: "Track Your Order — Glam Soles BD",
  description: "Track the status of your Glam Soles BD order using your order number and phone.",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; phone?: string; token?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container-boutique py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl text-charcoal md:text-4xl">Track your order</h1>
        <p className="mt-2 text-sm text-charcoal-soft">
          Enter your order number and the phone number used at checkout. Signed-in customers can leave the phone
          field blank.
        </p>
        <div className="mt-8">
          <TrackOrderForm initialOrderNumber={params.order ?? ""} initialPhone={params.phone ?? ""} initialToken={params.token} />
        </div>
      </div>
    </div>
  );
}
