import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Glam Rewards — Glam Soles BD",
  description: "Earn points, unlock discounts and get early access as a Glam Rewards member.",
};

const TIERS: { name: string; variant: "outline" | "gold" | "charcoal"; note: string }[] = [
  { name: "Bronze", variant: "outline", note: "Welcome tier — start earning from your first order." },
  { name: "Silver", variant: "outline", note: "Unlocked after your first few orders." },
  { name: "Gold", variant: "gold", note: "Priority perks and better point rates." },
  { name: "Platinum", variant: "charcoal", note: "Our top tier — early access and exclusive vouchers." },
];

/**
 * Marketing overview page only — this is not an authenticated account
 * dashboard and never shows or implies a real member's points balance.
 * That belongs to the account area in a later phase.
 */
export default function RewardsPage() {
  return (
    <div className="container-boutique py-8 md:py-12">
      <h1 className="text-3xl text-charcoal">Glam Rewards</h1>
      <p className="mt-2 max-w-xl text-sm text-charcoal-soft">
        Earn points on every order, unlock exclusive discounts, birthday offers, vouchers and early access to new
        collections as you move up through our membership tiers.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {TIERS.map((tier) => (
          <div key={tier.name} className="rounded-[var(--radius-card)] border border-line p-5">
            <Badge variant={tier.variant}>{tier.name}</Badge>
            <p className="mt-3 text-sm text-charcoal-soft">{tier.note}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-charcoal-soft">
        Sign in or create an account at checkout to start earning — your points balance and tier progress will show
        in your account area.
      </p>
    </div>
  );
}
