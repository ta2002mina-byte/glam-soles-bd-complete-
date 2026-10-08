import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getRewardSummary } from "@/lib/supabase/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Rewards — Glam Soles BD" };

const TIERS = ["bronze", "silver", "gold", "platinum"] as const;
const TIER_VARIANT = { bronze: "outline", silver: "outline", gold: "gold", platinum: "charcoal" } as const;

export default async function AccountRewardsPage() {
  const summary = await getRewardSummary();
  if (!summary) return null;

  const tierIndex = TIERS.indexOf(summary.tier);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg text-charcoal">Glam Rewards</h2>
        <p className="mt-1 text-sm text-charcoal-soft">{summary.points} points balance</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {TIERS.map((tier, index) => (
          <div
            key={tier}
            className={`rounded-[var(--radius-card)] border p-4 ${
              index === tierIndex ? "border-gold bg-cream/60" : "border-line"
            }`}
          >
            <Badge variant={TIER_VARIANT[tier]}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</Badge>
            {index === tierIndex && <p className="mt-2 text-xs font-medium text-gold">Your current tier</p>}
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-display text-base text-charcoal">Points history</h3>
        {summary.transactions.length === 0 ? (
          <EmptyState title="No points activity yet." description="Points earned on your orders will appear here." />
        ) : (
          <div className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {summary.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="text-charcoal">{tx.reason}</p>
                  <p className="mt-1 text-xs text-charcoal-soft">{formatDate(tx.createdAt)}</p>
                </div>
                <span className={tx.points >= 0 ? "font-semibold text-gold" : "font-semibold text-blush-deep"}>
                  {tx.points >= 0 ? "+" : ""}
                  {tx.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
