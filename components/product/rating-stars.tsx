import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export function RatingStars({ rating, reviewCount, size = 14 }: RatingStarsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={cn(
              i < Math.round(rating)
                ? "fill-gold text-gold"
                : "fill-transparent text-line"
            )}
          />
        ))}
      </div>
      <span className="sr-only">{rating} out of 5 stars</span>
      {reviewCount !== undefined && (
        <span className="text-xs text-charcoal-soft/70">({reviewCount})</span>
      )}
    </div>
  );
}
