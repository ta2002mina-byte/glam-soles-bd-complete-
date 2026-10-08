"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, MapPin, Phone, Search, Truck } from "lucide-react";
import { trackOrder } from "@/app/actions/track-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderStatusTimeline } from "@/components/account/order-status-timeline";
import { formatBDT, formatDateTime } from "@/lib/utils";
import type { OrderTrackingDetail } from "@/types";

export function TrackOrderForm({
  initialOrderNumber = "",
  initialPhone = "",
  initialToken,
}: {
  initialOrderNumber?: string;
  initialPhone?: string;
  initialToken?: string;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderTrackingDetail | null>(null);

  async function runSearch(token?: string) {
    setSubmitting(true);
    setError(null);
    const res = await trackOrder({ orderNumber, phone, token });
    setSubmitting(false);
    if (res.status === "not_found") {
      setError(res.message);
      setOrder(null);
      return;
    }
    setOrder(res.order);
  }

  useEffect(() => {
    // Auto-run once for links that arrive with a confirmation token or a
    // pre-filled order number (e.g. from order-success). Manual re-searches
    // via the form below never reuse that one-time token. Deferred via
    // setTimeout so the resulting setState calls happen outside the
    // effect's synchronous call stack (avoids cascading-render warnings).
    if (initialToken || (initialOrderNumber && initialPhone)) {
      const timer = setTimeout(() => {
        void runSearch(initialToken);
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await runSearch();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line p-5 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Order number</span>
          <div className="mt-1.5">
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              placeholder="GSB-260101-ABC123"
              required
            />
          </div>
        </label>
        <label className="block flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Phone number</span>
          <div className="mt-1.5">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX (used at checkout, or leave blank if signed in)"
            />
          </div>
        </label>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Track order
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-blush-deep">
          {error}
        </p>
      )}

      {order && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl text-charcoal">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-charcoal-soft">Placed {formatDateTime(order.createdAt)}</p>
          </div>

          <section className="rounded-[var(--radius-card)] border border-line p-5">
            <OrderStatusTimeline status={order.status} />
            {(order.courierName || order.trackingNumber) && (
              <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-sm text-charcoal-soft">
                <Truck size={15} />
                {order.courierName ?? "Courier"} {order.trackingNumber && `· Tracking #${order.trackingNumber}`}
              </p>
            )}
          </section>

          {order.address && (
            <section className="rounded-[var(--radius-card)] border border-line p-5">
              <div className="flex items-center gap-2 text-gold">
                <MapPin size={17} />
                <h3 className="font-display text-base text-charcoal">Delivery address</h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-charcoal">
                {order.address.full_address}, {order.address.area}, {order.address.district}, {order.address.division}
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm text-charcoal-soft">
                <Phone size={14} /> {order.address.phone}
              </p>
            </section>
          )}

          <section className="rounded-[var(--radius-card)] border border-line p-5 md:p-6">
            <h3 className="font-display text-base text-charcoal">Items</h3>
            <div className="mt-4 divide-y divide-line">
              {order.items.map((item, index) => (
                <div key={`${item.productName}-${item.color}-${item.size}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="text-charcoal">{item.productName}</p>
                    <p className="mt-1 text-xs text-charcoal-soft">
                      {item.color} · {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 text-charcoal">{formatBDT(item.lineTotal)}</span>
                </div>
              ))}
            </div>
            <dl className="mt-3 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatBDT(order.grandTotal)}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
