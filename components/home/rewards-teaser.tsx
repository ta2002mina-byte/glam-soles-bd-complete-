import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIERS = [
  { name: "Bronze", variant: "outline" as const },
  { name: "Silver", variant: "outline" as const },
  { name: "Gold", variant: "gold" as const },
  { name: "Platinum", variant: "charcoal" as const },
];

/**
 * Marketing teaser for the rewards program — describes how it works in
 * general terms. This does not display or imply any individual account's
 * real points balance; that lives in the authenticated account area.
 */
export function RewardsTeaser() {
  return (
    <section className="mt-16 rounded-[var(--radius-card)] bg-charcoal px-6 py-12 text-soft-white md:px-14">
      <div className="flex flex-wrap gap-2">
        {TIERS.map((tier) => (
          <Badge key={tier.name} variant={tier.variant}>
            {tier.name}
          </Badge>
        ))}
      </div>
      <h2 className="mt-5 font-display text-2xl md:text-3xl">Glam Rewards</h2>
      <p className="mt-2 max-w-lg text-sm text-soft-white/80">
        Earn points on every order, unlock exclusive discounts, birthday offers, vouchers and early access to new
        collections as you move up through Bronze, Silver, Gold and Platinum tiers.
      </p>
      <Link href="/rewards" className={cn(buttonVariants({ variant: "gold", size: "lg" }), "mt-6")}>
        Learn About Rewards
      </Link>
    </section>
  );
}
