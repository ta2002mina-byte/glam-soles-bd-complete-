import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { getUserReviews } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Reviews — Glam Soles BD" };

export default async function AccountReviewsPage() {
  const reviews = await getUserReviews();

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="You haven't written any reviews yet."
        description="Reviews you write on product pages will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="flex gap-4 rounded-[var(--radius-card)] border border-line p-4">
          <Link href={`/product/${review.productSlug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-cream">
            <Image
              src={review.productImage ?? "/images/product-fallback.svg"}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/product/${review.productSlug}`} className="text-sm font-medium text-charcoal hover:underline">
                {review.productName}
              </Link>
              <Badge variant={review.isApproved ? "charcoal" : "outline"}>
                {review.isApproved ? "Published" : "Awaiting approval"}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={cn(star <= review.rating ? "fill-gold text-gold" : "fill-transparent text-line")}
                />
              ))}
              {review.isVerifiedPurchase && (
                <span className="ml-2 text-xs font-medium text-gold">Verified Purchase</span>
              )}
            </div>
            {review.body && <p className="mt-2 text-sm text-charcoal-soft">{review.body}</p>}
            <p className="mt-2 text-xs text-charcoal-soft">{formatDate(review.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
