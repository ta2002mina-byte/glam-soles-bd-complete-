"use client";

import { cn } from "@/lib/utils";

interface ColorSelectorProps {
  colors: string[];
  selected: string | null;
  onSelect: (color: string) => void;
  /** Colors with zero stock across all sizes — shown but disabled. */
  unavailableColors?: string[];
}

export function ColorSelector({ colors, selected, onSelect, unavailableColors = [] }: ColorSelectorProps) {
  if (colors.length === 0) return null;

  return (
    <fieldset>
      <legend className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">
        Color{selected ? `: ${selected}` : ""}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
        {colors.map((color) => {
          const isSelected = color === selected;
          const isUnavailable = unavailableColors.includes(color);
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={isUnavailable ? `${color} (out of stock)` : color}
              disabled={isUnavailable}
              onClick={() => onSelect(color)}
              title={color}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-colors",
                isSelected ? "border-gold" : "border-line",
                isUnavailable && "opacity-30"
              )}
              style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
            >
              {isUnavailable && <span className="sr-only">Out of stock</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
