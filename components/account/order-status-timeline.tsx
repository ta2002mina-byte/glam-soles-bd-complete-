import { Check, X } from "lucide-react";
import { ORDER_STATUS_STEPS, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

/**
 * Renders the canonical Confirmed → Processing → Packed → Shipped →
 * Out for Delivery → Delivered progression against the order's real
 * current status. Cancelled/Returned orders show a dedicated end state
 * instead of a partially-filled progress bar.
 */
export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED" || status === "RETURNED") {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-cream/50 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush-deep text-soft-white">
          <X size={16} />
        </span>
        <p className="text-sm font-medium text-charcoal">
          {status === "CANCELLED" ? "This order was cancelled." : "This order was returned."}
        </p>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_STEPS.findIndex((s) => s.status === status);
  // "PENDING" orders (not yet confirmed) show the timeline with nothing completed yet.
  const activeIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-start">
      {ORDER_STATUS_STEPS.map((step, index) => {
        const isDone = index <= activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === ORDER_STATUS_STEPS.length - 1;

        return (
          <li key={step.status} className="flex flex-1 items-start gap-3 md:flex-col md:items-center md:text-center">
            <div className="flex flex-col items-center md:w-full">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  isDone ? "border-gold bg-gold text-soft-white" : "border-line bg-soft-white text-charcoal-soft"
                )}
                aria-hidden="true"
              >
                {isDone ? <Check size={15} /> : index + 1}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    "mt-1 h-8 w-0.5 md:mt-0 md:h-0.5 md:w-full",
                    index < activeIndex ? "bg-gold" : "bg-line"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            <p
              className={cn(
                "pb-6 text-sm md:pb-0 md:pt-2",
                isCurrent ? "font-semibold text-charcoal" : isDone ? "text-charcoal" : "text-charcoal-soft"
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
