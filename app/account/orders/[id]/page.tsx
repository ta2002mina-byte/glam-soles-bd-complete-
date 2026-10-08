import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Truck } from "lucide-react";
import { getAccountOrderDetail } from "@/lib/supabase/queries";
import { OrderStatusTimeline } from "@/components/account/order-status-timeline";
import { formatBDT, formatDateTime } from "@/lib/utils";

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getAccountOrderDetail(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-charcoal-soft hover:text-charcoal">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-charcoal">{order.orderNumber}</h2>
          <p className="mt-1 text-sm text-charcoal-soft">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        {order.status === "DELIVERED" && (
          <Link
            href="/account/returns"
            className="text-sm font-medium text-charcoal underline underline-offset-2"
          >
            Request a return or exchange
          </Link>
        )}
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

      <div className="grid gap-5 md:grid-cols-2">
        {order.address && (
          <section className="rounded-[var(--radius-card)] border border-line p-5">
            <div className="flex items-center gap-2 text-gold">
              <MapPin size={17} />
              <h3 className="font-display text-base text-charcoal">Delivery address</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-charcoal">
              {order.address.full_address}, {order.address.area}, {order.address.district}, {order.address.division}
            </p>
            {order.address.delivery_note && (
              <p className="mt-2 text-xs text-charcoal-soft">Note: {order.address.delivery_note}</p>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm text-charcoal-soft">
              <Phone size={14} /> {order.address.phone}
            </p>
          </section>
        )}

        <section className="rounded-[var(--radius-card)] border border-line p-5">
          <h3 className="font-display text-base text-charcoal">Payment</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-charcoal-soft">Method</dt>
              <dd>Cash on Delivery</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-charcoal-soft">Delivery zone</dt>
              <dd className="capitalize">{order.deliveryZone.replace(/_/g, " ")}</dd>
            </div>
          </dl>
        </section>
      </div>

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
          <div className="flex justify-between">
            <dt className="text-charcoal-soft">Subtotal</dt>
            <dd>{formatBDT(order.subtotal)}</dd>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <dt className="text-charcoal-soft">Discount</dt>
              <dd className="text-gold">−{formatBDT(order.discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-charcoal-soft">Delivery</dt>
            <dd>{order.deliveryFee === 0 ? "Free" : formatBDT(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatBDT(order.grandTotal)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
