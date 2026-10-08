import type { Metadata } from "next";
import Link from "next/link";
import { Check, MapPin, PackageCheck, Phone, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

interface ConfirmationAddress {
  full_name: string;
  phone: string;
  email?: string;
  division: string;
  district: string;
  area: string;
  full_address: string;
  delivery_note?: string;
}

interface ConfirmationItem {
  product_name: string;
  color: string;
  size: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface ConfirmationPayload {
  order: {
    id: string;
    order_number: string;
    status: string;
    guest_name: string;
    guest_phone: string;
    subtotal: number;
    discount_amount: number;
    delivery_fee: number;
    grand_total: number;
    delivery_zone: string;
    shipping_address: ConfirmationAddress;
    created_at: string;
  };
  items: ConfirmationItem[];
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string }>;
}) {
  const params = await searchParams;
  if (!params.order) return <EmptyState title="We couldn't find that order." action={<Link href="/" className={buttonVariants()}>Continue shopping</Link>} />;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order_confirmation", {
    p_order_id: params.order,
    p_confirmation_token: params.token ?? null,
  });
  const payload = data as ConfirmationPayload | null;
  if (!payload?.order) {
    return (
      <div className="container-boutique py-16">
        <EmptyState
          title="We couldn't find that order."
          description="This confirmation link may have expired or the order details are not available."
          action={<Link href="/" className={buttonVariants()}>Continue shopping</Link>}
        />
      </div>
    );
  }

  const { order } = payload;
  const address = order.shipping_address;
  return (
    <div className="container-boutique py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold text-soft-white"><Check size={28} /></span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Order confirmed</p>
          <h1 className="mt-2 text-3xl text-charcoal md:text-4xl">Thank you, {order.guest_name}.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-charcoal-soft">
            Your order is confirmed. We’ll contact you at {order.guest_phone} before delivery.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section id="status" className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <div className="flex items-center gap-2 text-gold"><PackageCheck size={18} /><h2 className="font-display text-lg text-charcoal">Order details</h2></div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-charcoal-soft">Order ID</dt><dd className="font-semibold text-charcoal">{order.order_number}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-charcoal-soft">Payment</dt><dd>Cash on Delivery</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-charcoal-soft">Estimated delivery</dt><dd>{order.delivery_zone === "express" ? "1–2 working days" : order.delivery_zone === "outside_dhaka" ? "3–5 working days" : "2–4 working days"}</dd></div>
            </dl>
          </section>
          <section className="rounded-[var(--radius-card)] border border-line bg-soft-white p-5">
            <div className="flex items-center gap-2 text-gold"><MapPin size={18} /><h2 className="font-display text-lg text-charcoal">Delivering to</h2></div>
            <p className="mt-4 text-sm leading-6 text-charcoal">
              {address.full_address}, {address.area}, {address.district}, {address.division}
            </p>
            {address.delivery_note && <p className="mt-2 text-xs text-charcoal-soft">Note: {address.delivery_note}</p>}
            <p className="mt-3 flex items-center gap-2 text-sm text-charcoal-soft"><Phone size={14} /> {address.phone}</p>
          </section>
        </div>

        <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-soft-white p-5 md:p-6">
          <h2 className="font-display text-lg text-charcoal">Your items</h2>
          <div className="mt-4 divide-y divide-line">
            {payload.items.map((item, index) => (
              <div key={`${item.product_name}-${item.color}-${item.size}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div><p className="text-charcoal">{item.product_name}</p><p className="mt-1 text-xs text-charcoal-soft">{item.color} · {item.size} · Qty {item.quantity}</p></div>
                <span className="shrink-0 text-charcoal">{formatBDT(Number(item.line_total))}</span>
              </div>
            ))}
          </div>
          <dl className="mt-3 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-charcoal-soft">Subtotal</dt><dd>{formatBDT(Number(order.subtotal))}</dd></div>
            {Number(order.discount_amount) > 0 && <div className="flex justify-between"><dt className="text-charcoal-soft">Discount</dt><dd className="text-gold">−{formatBDT(Number(order.discount_amount))}</dd></div>}
            <div className="flex justify-between"><dt className="text-charcoal-soft">Delivery</dt><dd>{Number(order.delivery_fee) === 0 ? "Free" : formatBDT(Number(order.delivery_fee))}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatBDT(Number(order.grand_total))}</dd></div>
          </dl>
        </section>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}><ShoppingBag size={17} /> Continue shopping</Link>
          <Link href={`/order-success?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(params.token ?? "")}#status`} className={buttonVariants({ variant: "outline" })}>View order status</Link>
        </div>
      </div>
    </div>
  );
}