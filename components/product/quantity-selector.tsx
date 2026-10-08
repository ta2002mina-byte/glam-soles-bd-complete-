"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  max: number;
  disabled?: boolean;
}

export function QuantitySelector({ quantity, onChange, max, disabled }: QuantitySelectorProps) {
  const clamp = (n: number) => Math.max(1, Math.min(max || 1, n));

  return (
    <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-line">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || quantity <= 1}
        onClick={() => onChange(clamp(quantity - 1))}
        className={cn("flex h-10 w-10 items-center justify-center text-charcoal disabled:opacity-30")}
      >
        <Minus size={14} />
      </button>
      <span aria-live="polite" className="w-8 text-center text-sm font-medium text-charcoal">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || quantity >= max}
        onClick={() => onChange(clamp(quantity + 1))}
        className={cn("flex h-10 w-10 items-center justify-center text-charcoal disabled:opacity-30")}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
