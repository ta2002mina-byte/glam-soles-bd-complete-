import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { ReturnRequestSummary, ReturnStatusUi } from "@/types";

const STATUS_VARIANT: Record<ReturnStatusUi, "gold" | "blush" | "charcoal" | "outline"> = {
  requested: "blush",
  approved: "gold",
  rejected: "outline",
  exchanged: "gold",
  refunded: "charcoal",
  completed: "charcoal",
};

const REASON_LABEL: Record<string, string> = {
  wrong_size: "Wrong size",
  wrong_product: "Wrong product",
  damaged: "Damaged",
  defective: "Defective",
  other: "Other",
};

export function ReturnList({ returns }: { returns: ReturnRequestSummary[] }) {
  if (returns.length === 0) {
    return <EmptyState title="No return or exchange requests yet." />;
  }

  return (
    <div className="space-y-3">
      {returns.map((request) => (
        <div key={request.id} className="flex gap-4 rounded-[var(--radius-card)] border border-line p-4">
          {request.photoUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-cream">
              <Image src={request.photoUrl} alt="" fill sizes="64px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-charcoal">{request.productName}</p>
              <Badge variant={STATUS_VARIANT[request.status]} className="capitalize">
                {request.status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-charcoal-soft">
              {request.color} · {request.size} · Order {request.orderNumber}
            </p>
            <p className="mt-1 text-xs text-charcoal-soft">
              {REASON_LABEL[request.reason] ?? request.reason} · Requested {formatDate(request.createdAt)}
            </p>
            {request.description && <p className="mt-2 text-sm text-charcoal-soft">{request.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
