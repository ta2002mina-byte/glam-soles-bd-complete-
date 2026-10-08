import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "Our returns and exchange policy for Glam Soles BD orders.",
  alternates: { canonical: "/returns" },
};

const REASONS = ["Wrong size", "Wrong product", "Damaged", "Defective", "Other"];

export default function ReturnsPage() {
  return (
    <div className="container-boutique py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-charcoal">Returns &amp; Exchanges</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">
          Not the right fit? We offer easy exchanges and returns on delivered orders. Sign in to your
          account to submit a request for any eligible item — our team reviews every request and keeps
          you updated on its status.
        </p>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-charcoal">Accepted reasons</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-line px-4 py-1.5 text-xs text-charcoal-soft"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-3 text-sm leading-relaxed text-charcoal-soft">
          <p>
            Requests can be submitted with a short description and an optional photo, and are reviewed
            by our team before approval. Once approved, we&apos;ll arrange the exchange or return
            pickup with you directly.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/account/returns" className={cn(buttonVariants({ size: "lg" }))}>
            Start a Return or Exchange
          </Link>
        </div>
      </div>
    </div>
  );
}
