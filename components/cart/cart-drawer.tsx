"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { buttonVariants } from "@/components/ui/button";
import { CartLineRow } from "@/components/cart/cart-line-row";
import { EmptyState } from "@/components/shared/empty-state";
import { useCart } from "@/components/providers/cart-provider";
import { formatBDT, cn } from "@/lib/utils";

export function CartDrawer() {
  const { lines, subtotal, isDrawerOpen, closeDrawer, removeLine, setQuantity } = useCart();

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={`Your Bag${lines.length > 0 ? ` (${lines.length})` : ""}`}
      footer={
        lines.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-charcoal-soft">Subtotal</span>
              <span className="font-medium text-charcoal">{formatBDT(subtotal)}</span>
            </div>
            <p className="text-xs text-charcoal-soft/70">Delivery and any discount are calculated at checkout.</p>
            <div className="flex gap-3">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className={cn(buttonVariants({ variant: "outline", size: "md" }), "flex-1")}
              >
                View Bag
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className={cn(buttonVariants({ size: "md" }), "flex-1")}
              >
                Checkout
              </Link>
            </div>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          title="Your bag is waiting for something fabulous."
          action={
            <Link href="/" onClick={closeDrawer} className={buttonVariants({ size: "sm" })}>
              Continue Shopping
            </Link>
          }
        />
      ) : (
        <div>
          {lines.map((line) => (
            <CartLineRow
              key={line.variantId}
              line={line}
              compact
              onQuantityChange={(q) => setQuantity(line.variantId, q)}
              onRemove={() => removeLine(line.variantId)}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
