import type { Product, Review } from "@/types";
import { ReviewList } from "@/components/product/review-list";
import { ReviewForm } from "@/components/product/review-form";
import type { ReviewEligibility } from "@/lib/supabase/queries";

export function ReviewSection({
  product,
  reviews,
  eligibility,
}: {
  product: Product;
  reviews: Review[];
  eligibility: ReviewEligibility;
}) {
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="text-2xl text-charcoal">Reviews</h2>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ReviewList reviews={reviews} rating={product.rating} reviewCount={product.reviewCount} />
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide text-charcoal-soft">Write a review</h3>
          <div className="mt-3">
            <ReviewForm productId={product.id} productSlug={product.slug} eligibility={eligibility} />
          </div>
        </div>
      </div>
    </section>
  );
}
