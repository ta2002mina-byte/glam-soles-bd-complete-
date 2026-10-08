"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateOrderStatus, updateOrderCourier, updatePaymentStatus } from "@/app/actions/admin/orders";
import type { DbOrderStatus, DbPaymentStatus } from "@/types/database";

const ORDER_NEXT_STEPS: Partial<Record<DbOrderStatus, { next: DbOrderStatus; label: string }>> = {
  pending: { next: "confirmed", label: "Confirm order" },
  confirmed: { next: "processing", label: "Mark processing" },
  processing: { next: "packed", label: "Mark packed" },
  packed: { next: "shipped", label: "Mark shipped" },
  shipped: { next: "out_for_delivery", label: "Mark out for delivery" },
  out_for_delivery: { next: "delivered", label: "Mark delivered" },
  delivered: { next: "returned", label: "Mark returned" },
};

const CANCELLABLE: DbOrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery"];

export function CourierControl({
  orderId,
  courierName,
  trackingNumber,
}: {
  orderId: string;
  courierName: string | null;
  trackingNumber: string | null;
}) {
  const router = useRouter();
  const [courier, setCourier] = useState(courierName ?? "");
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrderCourier(orderId, courier, tracking);
      if (result.status === "success") {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
      <h2 className="mb-3 font-display text-lg text-charcoal">Courier &amp; tracking</h2>
      <p className="mb-3 text-xs text-charcoal-soft">Shown to the customer on /track-order once saved.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="courier-name" className="mb-1 block text-xs font-medium text-charcoal">
            Courier
          </label>
          <input
            id="courier-name"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="e.g. Pathao, Steadfast"
            className="h-9 w-full rounded-lg border border-line bg-soft-white px-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
        <div>
          <label htmlFor="tracking-number" className="mb-1 block text-xs font-medium text-charcoal">
            Tracking number
          </label>
          <input
            id="tracking-number"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            className="h-9 w-full rounded-lg border border-line bg-soft-white px-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending} className="mt-3">
        {pending ? "Saving…" : "Save"}
      </Button>
      {saved && !pending && <span className="ml-3 text-xs text-charcoal-soft">Saved.</span>}
    </form>
  );
}

export function OrderStatusControl({ orderId, status }: { orderId: string; status: DbOrderStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: DbOrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  const nextStep = ORDER_NEXT_STEPS[status];

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
      <h2 className="mb-3 font-display text-lg text-charcoal">Order status</h2>
      <div className="flex flex-wrap gap-2">
        {nextStep && (
          <Button type="button" size="sm" disabled={pending} onClick={() => apply(nextStep.next)}>
            {nextStep.label}
          </Button>
        )}
        {CANCELLABLE.includes(status) && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => apply("cancelled")}>
            Cancel order
          </Button>
        )}
        {!nextStep && !CANCELLABLE.includes(status) && (
          <p className="text-sm text-charcoal-soft">This order is in a final state.</p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-blush-deep">
          {error}
        </p>
      )}
    </div>
  );
}

export function PaymentStatusControl({
  paymentId,
  orderId,
  status,
  canRefund,
}: {
  paymentId: string;
  orderId: string;
  status: DbPaymentStatus;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: DbPaymentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updatePaymentStatus(paymentId, orderId, next);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
      <h2 className="mb-3 font-display text-lg text-charcoal">Cash on Delivery payment</h2>
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => apply("collected")}>
              Mark payment collected
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => apply("failed")}>
              Mark failed
            </Button>
          </>
        )}
        {status === "failed" && (
          <Button type="button" size="sm" disabled={pending} onClick={() => apply("collected")}>
            Mark payment collected
          </Button>
        )}
        {status === "collected" && canRefund && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => apply("refunded")}>
            Mark refunded
          </Button>
        )}
        {status === "collected" && !canRefund && <p className="text-sm text-charcoal-soft">Collected. Only a manager or admin can issue a refund.</p>}
        {status === "refunded" && <p className="text-sm text-charcoal-soft">This payment was refunded.</p>}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-blush-deep">
          {error}
        </p>
      )}
    </div>
  );
}
