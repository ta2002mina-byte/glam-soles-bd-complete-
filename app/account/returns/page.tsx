import type { Metadata } from "next";
import { getReturnEligibleItems, getUserReturns } from "@/lib/supabase/queries";
import { ReturnRequestForm } from "@/components/account/return-request-form";
import { ReturnList } from "@/components/account/return-list";

export const metadata: Metadata = { title: "Returns & Exchanges — Glam Soles BD" };

export default async function AccountReturnsPage() {
  const [eligibleItems, returns] = await Promise.all([getReturnEligibleItems(), getUserReturns()]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-lg text-charcoal">Request a return or exchange</h2>
        <p className="mt-1 text-sm text-charcoal-soft">Available for items from delivered orders.</p>
        <div className="mt-4">
          <ReturnRequestForm eligibleItems={eligibleItems} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg text-charcoal">Your requests</h2>
        <div className="mt-4">
          <ReturnList returns={returns} />
        </div>
      </div>
    </div>
  );
}
