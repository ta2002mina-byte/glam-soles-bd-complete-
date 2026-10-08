import { formatBDT } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  oldPrice?: number;
  discountPercent?: number;
}

export function PriceDisplay({ price, oldPrice, discountPercent }: PriceDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-charcoal">{formatBDT(price)}</span>
      {oldPrice && (
        <span className="text-sm text-charcoal-soft/60 line-through">
          {formatBDT(oldPrice)}
        </span>
      )}
      {discountPercent && (
        <span className="text-sm font-medium text-blush-deep">
          -{discountPercent}%
        </span>
      )}
    </div>
  );
}
