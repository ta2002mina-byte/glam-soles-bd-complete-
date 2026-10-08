import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession, roleAtLeast } from "@/lib/supabase/admin/guard";
import { getAdminOrderById } from "@/lib/supabase/admin/queries";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { OrderStatusControl, PaymentStatusControl, CourierControl } from "@/components/admin/order-controls";
import { formatBDT } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order — Glam Soles BD Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return null;

  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/orders" className="text-sm text-charcoal-soft hover:underline">
            ← All orders
          </Link>
          <h1 className="mt-1 font-display text-2xl text-charcoal">{order.orderNumber}</h1>
          <p className="text-sm text-charcoal-soft">{new Date(order.createdAt).toLocaleString("en-GB")}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <h2 className="mb-3 font-display text-lg text-charcoal">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-charcoal-soft">
                  <tr>
                    <th className="pb-2 pr-2 font-medium">Product</th>
                    <th className="pb-2 pr-2 font-medium">Color / Size</th>
                    <th className="pb-2 pr-2 font-medium">Unit price</th>
                    <th className="pb-2 pr-2 font-medium">Qty</th>
                    <th className="pb-2 font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-2 text-charcoal">{item.productName}</td>
                      <td className="py-2 pr-2 text-charcoal-soft">
                        {item.color} / {item.size}
                      </td>
                      <td className="py-2 pr-2 text-charcoal-soft">{formatBDT(item.unitPrice)}</td>
                      <td className="py-2 pr-2 text-charcoal-soft">{item.quantity}</td>
                      <td className="py-2 text-charcoal">{formatBDT(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Subtotal</dt>
                <dd className="text-charcoal">{formatBDT(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Discount</dt>
                <dd className="text-charcoal">-{formatBDT(order.discountAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-soft">Delivery fee</dt>
                <dd className="text-charcoal">{formatBDT(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-medium">
                <dt className="text-charcoal">Grand total</dt>
                <dd className="text-charcoal">{formatBDT(order.grandTotal)}</dd>
              </div>
            </dl>
          </div>

          <OrderStatusControl orderId={order.id} status={order.status} />

          <CourierControl orderId={order.id} courierName={order.courierName} trackingNumber={order.trackingNumber} />

          {order.payment && (
            <PaymentStatusControl
              paymentId={order.payment.id}
              orderId={order.id}
              status={order.payment.status}
              canRefund={roleAtLeast(session.role, "manager")}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <h2 className="mb-3 font-display text-lg text-charcoal">Customer</h2>
            <p className="text-sm text-charcoal">{order.customerName}</p>
            <p className="text-sm text-charcoal-soft">{order.phone}</p>
            {order.email && <p className="text-sm text-charcoal-soft">{order.email}</p>}
            {order.userId && (
              <Link href={`/admin/customers/${order.userId}`} className="mt-2 inline-block text-sm text-charcoal underline-offset-2 hover:underline">
                View customer
              </Link>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <h2 className="mb-3 font-display text-lg text-charcoal">Delivery</h2>
            <p className="text-xs uppercase tracking-wide text-charcoal-soft">{order.deliveryZone.replace("_", " ")}</p>
            {order.address ? (
              <p className="mt-2 text-sm text-charcoal-soft">
                {order.address.fullAddress}, {order.address.area}, {order.address.district}, {order.address.division}
                {order.address.deliveryNote && <span className="mt-1 block italic">Note: {order.address.deliveryNote}</span>}
              </p>
            ) : (
              <p className="mt-2 text-sm text-charcoal-soft">No saved address on file.</p>
            )}
          </div>

          {order.payment && (
            <div className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
              <h2 className="mb-3 font-display text-lg text-charcoal">Payment</h2>
              <p className="text-sm text-charcoal-soft">Method: Cash on Delivery</p>
              <p className="mt-1 text-sm text-charcoal-soft">Amount: {formatBDT(order.payment.amount)}</p>
              <div className="mt-2">
                <PaymentStatusBadge status={order.payment.status} />
              </div>
              {order.payment.paidAt && (
                <p className="mt-2 text-xs text-charcoal-soft">Collected {new Date(order.payment.paidAt).toLocaleString("en-GB")}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
