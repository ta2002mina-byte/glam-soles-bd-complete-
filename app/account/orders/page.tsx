import type { Metadata } from "next";
import Link from "next/link";
import { getAccountOrders } from "@/lib/supabase/queries";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatBDT, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "My Orders — Glam Soles BD" };

const STATUS_VARIANT: Record<OrderStatus, "gold" | "blush" | "charcoal" | "outline"> = {
  PENDING: "outline",
  CONFIRMED: "blush",
  PROCESSING: "blush",
  PACKED: "blush",
  SHIPPED: "gold",
  OUT_FOR_DELIVERY: "gold",
  DELIVERED: "charcoal",
  CANCELLED: "outline",
  RETURNED: "outline",
};

export default async function AccountOrdersPage() {
  const orders = await getAccountOrders();

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet."
        description="When you place an order, it will show up here."
        action={
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line p-4 transition-colors hover:border-gold sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-charcoal">{order.orderNumber}</p>
            <p className="mt-1 text-xs text-charcoal-soft">
              {formatDate(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"} ·{" "}
              {order.paymentMethod} ({order.paymentStatus === "COLLECTED" ? "Paid" : "Pending"})
            </p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status.replace(/_/g, " ")}</Badge>
            <span className="font-semibold text-charcoal">{formatBDT(order.grandTotal)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
