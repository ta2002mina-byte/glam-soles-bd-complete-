import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import type { Review } from "@/types";
import { RatingStars } from "@/components/product/rating-stars";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

export function ReviewList({ reviews, rating, reviewCount }: { reviews: Review[]; rating?: number; reviewCount?: number }) {
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const total = reviews.length;

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        <div className="shrink-0 text-center sm:text-left">
          <p className="font-display text-4xl text-charcoal">{rating?.toFixed(1) ?? "—"}</p>
          {rating !== undefined && (
            <div className="mt-1 flex justify-center sm:justify-start">
              <RatingStars rating={rating} size={16} />
            </div>
          )}
          <p className="mt-1 text-xs text-charcoal-soft">
            {reviewCount ?? 0} review{(reviewCount ?? 0) === 1 ? "" : "s"}
          </p>
        </div>

        {total > 0 && (
          <div className="flex-1 space-y-1.5">
            {breakdown.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2 text-xs text-charcoal-soft">
                <span className="w-10 shrink-0">{star} star</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-8 text-sm text-charcoal-soft">
          No reviews yet. Be the first to share your experience.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RatingStars rating={review.rating} size={14} />
                  {review.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gold">
                      <BadgeCheck size={14} /> Verified Purchase
                    </span>
                  )}
                </div>
                <span className="text-xs text-charcoal-soft/60">{timeAgo(review.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-charcoal">{review.authorName}</p>
              {review.sizeFeedback && (
                <p className="mt-1 text-xs text-charcoal-soft">Fit: {review.sizeFeedback}</p>
              )}
              {review.body && <p className="mt-2 text-sm text-charcoal-soft">{review.body}</p>}
              {review.photoUrls.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {review.photoUrls.map((url) => (
                    <div key={url} className="relative h-16 w-16 overflow-hidden rounded-[var(--radius-card)] bg-cream">
                      <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
