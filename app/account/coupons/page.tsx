import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { getAvailableCoupons, getCouponUsageHistory } from "@/lib/supabase/queries";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Coupons — Glam Soles BD" };

function describeCoupon(c: Awaited<ReturnType<typeof getAvailableCoupons>>[number]) {
  const parts: string[] = [];
  if (c.type === "percentage") parts.push(`${c.value}% off`);
  else if (c.type === "fixed") parts.push(`৳${c.value} off`);
  else parts.push("Free delivery");
  if (c.minOrderAmount > 0) parts.push(`min. order ৳${c.minOrderAmount}`);
  if (c.membershipTierRequired) parts.push(`${c.membershipTierRequired}+ tier`);
  if (c.firstOrderOnly) parts.push("first order only");
  return parts.join(" · ");
}

export default async function AccountCouponsPage() {
  const [available, history] = await Promise.all([getAvailableCoupons(), getCouponUsageHistory()]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg text-charcoal">Available coupons</h2>
        {available.length === 0 ? (
          <EmptyState title="No active coupons right now." description="Check back soon for new offers." />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {available.map((c) => (
              <div
                key={c.code}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-card)] border p-4",
                  c.eligible ? "border-gold bg-cream/40" : "border-line opacity-60"
                )}
              >
                <Ticket size={18} className="mt-0.5 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-charcoal">{c.code}</p>
                  <p className="mt-1 text-xs text-charcoal-soft">{describeCoupon(c)}</p>
                  {c.expiresAt && <p className="mt-1 text-xs text-charcoal-soft">Expires {formatDate(c.expiresAt)}</p>}
                  {!c.eligible && c.ineligibleReason && (
                    <Badge variant="outline" className="mt-2">
                      {c.ineligibleReason}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg text-charcoal">Redemption history</h2>
        {history.length === 0 ? (
          <EmptyState title="No coupons used yet." />
        ) : (
          <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {history.map((h, index) => (
              <div key={`${h.code}-${index}`} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-mono font-medium text-charcoal">{h.code}</p>
                  {h.orderNumber && <p className="mt-1 text-xs text-charcoal-soft">Order {h.orderNumber}</p>}
                </div>
                <span className="text-xs text-charcoal-soft">{formatDate(h.usedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
