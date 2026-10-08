"use client";

import { cn } from "@/lib/utils";

interface SizeOption {
  size: string;
  available: boolean;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selected: string | null;
  onSelect: (size: string) => void;
  onOpenSizeGuide?: () => void;
}

export function SizeSelector({ sizes, selected, onSelect, onOpenSizeGuide }: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <fieldset>
      <div className="flex items-center justify-between">
        <legend className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">
          Size{selected ? `: ${selected}` : ""}
        </legend>
        {onOpenSizeGuide && (
          <button
            type="button"
            onClick={onOpenSizeGuide}
            className="text-xs font-medium text-charcoal underline underline-offset-2"
          >
            Size Guide
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
        {sizes.map(({ size, available }) => {
          const isSelected = size === selected;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={available ? `Size ${size}` : `Size ${size} (out of stock)`}
              disabled={!available}
              onClick={() => onSelect(size)}
              className={cn(
                "min-w-11 rounded-[var(--radius-pill)] border px-3 py-2 text-sm transition-colors",
                isSelected ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal hover:border-charcoal",
                !available && "cursor-not-allowed border-line text-charcoal-soft/40 line-through hover:border-line"
              )}
            >
              {size}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
