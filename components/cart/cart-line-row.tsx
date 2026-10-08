"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import type { CartLine } from "@/types";
import { formatBDT, cn } from "@/lib/utils";
import { QuantitySelector } from "@/components/product/quantity-selector";

interface CartLineRowProps {
  line: CartLine;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater?: () => void;
  /** Live stock ceiling from validation — undefined while not yet checked (drawer). */
  maxQuantity?: number;
  warning?: string;
  compact?: boolean;
}

export function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  maxQuantity,
  warning,
  compact,
}: CartLineRowProps) {
  const href = line.slug ? `/product/${line.slug}` : undefined;

  const image = (
    <div className={cn("relative shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-cream", compact ? "h-20 w-16" : "h-28 w-24")}>
      <Image src={line.image} alt={line.name} fill sizes="120px" className="object-cover" />
    </div>
  );

  return (
    <div className="flex gap-3 border-b border-line py-4 last:border-none">
      {href ? <Link href={href}>{image}</Link> : image}

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          {href ? (
            <Link href={href} className="text-sm font-medium text-charcoal hover:underline">
              {line.name}
            </Link>
          ) : (
            <p className="text-sm font-medium text-charcoal">{line.name}</p>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${line.name} from bag`}
            className="text-charcoal-soft/60 hover:text-blush-deep"
          >
            <X size={16} />
          </button>
        </div>

        {(line.color || line.size) && (
          <p className="text-xs text-charcoal-soft/70">
            {[line.color, line.size].filter(Boolean).join(" · ")}
          </p>
        )}

        {warning && (
          <p role="status" className="text-xs font-medium text-blush-deep">
            {warning}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          <QuantitySelector
            quantity={line.quantity}
            onChange={onQuantityChange}
            max={maxQuantity ?? 99}
          />
          <span className="text-sm font-medium text-charcoal">
            {formatBDT(line.unitPrice * line.quantity)}
          </span>
        </div>

        {onSaveForLater && (
          <button
            type="button"
            onClick={onSaveForLater}
            className="mt-1 flex w-fit items-center gap-1 text-xs text-charcoal-soft underline underline-offset-2 hover:text-charcoal"
          >
            <Heart size={12} /> Save for later
          </button>
        )}
      </div>
    </div>
  );
}
