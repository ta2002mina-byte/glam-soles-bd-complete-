import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
  getProductReviews,
  getMyReviewEligibility,
} from "@/lib/supabase/queries";
import { ProductDetailInteractive } from "@/components/product/product-detail-interactive";
import { ProductInfoSections } from "@/components/product/product-info-sections";
import { ReviewSection } from "@/components/product/review-section";
import { CollectionSection } from "@/components/home/collection-section";
import { RecentlyViewedRail } from "@/components/product/recently-viewed-rail";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";

interface ProductPageParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found — Glam Soles BD" };
  }

  const title = `${product.name} — Glam Soles BD`;
  const description =
    product.description?.slice(0, 160) ??
    `Shop ${product.name} at Glam Soles BD. STEP INTO YOUR BEST VIBE.`;
  const image = product.images[0];

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/product/${product.slug}`,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailsPage({ params }: ProductPageParams) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const [related, frequentlyBoughtTogether, reviews, eligibility] = await Promise.all([
    getRelatedProducts(product.id, 8),
    getFrequentlyBoughtTogether(product.id, 4),
    getProductReviews(product.id),
    getMyReviewEligibility(product.id),
  ]);

  // Real product structured data only — ratings/reviews reflect actual
  // approved reviews, never invented numbers.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.images,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: product.price,
      availability:
        product.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: `/product/${product.slug}`,
    },
    ...(product.rating !== undefined && product.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <div className="container-boutique py-8 pb-28 md:py-12 md:pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <RecentlyViewedTracker productId={product.id} />

      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-charcoal-soft/70">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/${product.category}`} className="capitalize hover:underline">
              {product.category}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal">{product.name}</li>
        </ol>
      </nav>

      <ProductDetailInteractive product={product} />

      <div className="mt-16 max-w-3xl">
        <ProductInfoSections product={product} />
      </div>

      {frequentlyBoughtTogether.length > 0 && (
        <CollectionSection title="Frequently Bought Together" products={frequentlyBoughtTogether} />
      )}

      {related.length > 0 && (
        <CollectionSection title="You May Also Like" subtitle="Related products" products={related} />
      )}

      <RecentlyViewedRail excludeProductId={product.id} />

      <ReviewSection product={product} reviews={reviews} eligibility={eligibility} />
    </div>
  );
}
