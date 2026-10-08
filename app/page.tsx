import Link from "next/link";
import Image from "next/image";
import { Hero } from "@/components/home/hero";
import { CollectionSection } from "@/components/home/collection-section";
import { PromoBanners } from "@/components/home/promo-banners";
import { WhyUs } from "@/components/home/why-us";
import { RewardsTeaser } from "@/components/home/rewards-teaser";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import {
  getActiveBanners,
  getBestSellers,
  getNewArrivals,
  getProductsByCategorySlug,
  getTopLevelCategories,
  type TopLevelCategory,
} from "@/lib/supabase/queries";
import type { ProductCategory } from "@/types";

const CATEGORY_TAGLINES: Record<ProductCategory, string> = {
  women: "Elegant · Trendy · Confident",
  men: "Classic · Modern · Bold",
  kids: "Comfort · Fun · Active",
  accessories: "Complete Your Look",
};

// Fallback used only if a category row is somehow missing from the DB —
// keeps the four core nav destinations reachable even in that edge case.
const FALLBACK_CATEGORIES: TopLevelCategory[] = [
  { slug: "women", name: "Women", description: null, bannerImageUrl: null },
  { slug: "men", name: "Men", description: null, bannerImageUrl: null },
  { slug: "kids", name: "Kids", description: null, bannerImageUrl: null },
  { slug: "accessories", name: "Accessories", description: null, bannerImageUrl: null },
];

export default async function HomePage() {
  const [
    heroBanners,
    promoBanners,
    categories,
    womenProducts,
    menProducts,
    kidsProducts,
    accessoriesProducts,
    newArrivals,
    bestSellers,
  ] = await Promise.all([
    getActiveBanners("hero"),
    getActiveBanners("promo"),
    getTopLevelCategories(),
    getProductsByCategorySlug("women", 4),
    getProductsByCategorySlug("men", 4),
    getProductsByCategorySlug("kids", 4),
    getProductsByCategorySlug("accessories", 4),
    getNewArrivals(8),
    getBestSellers(8),
  ]);

  const displayCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <div className="container-boutique py-8 md:py-12">
      <Hero banner={heroBanners[0] ?? null} />

      {/* Shop by category */}
      <section id="categories" className="mt-14 scroll-mt-24">
        <h2 className="mb-1 text-2xl text-charcoal">Shop by Category</h2>
        <p className="mb-6 text-sm text-charcoal-soft">Find your perfect pair</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {displayCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="group relative block overflow-hidden rounded-[var(--radius-card)] bg-cream p-5 transition-colors hover:bg-blush"
            >
              {cat.bannerImageUrl && (
                <div className="absolute inset-0 -z-0">
                  <Image
                    src={cat.bannerImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover opacity-25 transition-opacity group-hover:opacity-35"
                  />
                </div>
              )}
              <div className="relative">
                <p className="font-display text-lg text-charcoal">{cat.name}</p>
                <p className="mt-1 text-xs text-charcoal-soft">
                  {cat.description ?? CATEGORY_TAGLINES[cat.slug]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CollectionSection
        title="New Arrivals"
        subtitle="Fresh off the shelf"
        products={newArrivals}
        viewAllHref="/search?sort=newest"
        emptyTitle="New styles are on the way"
        emptyDescription="Check back soon — we add fresh arrivals regularly."
      />

      <CollectionSection
        title="Best Sellers"
        subtitle="Loved by our customers"
        products={bestSellers}
        viewAllHref="/search?sort=best-selling"
        emptyTitle="Best sellers coming soon"
        emptyDescription="Once orders start rolling in, our most-loved styles will show up here."
      />

      <PromoBanners banners={promoBanners} />

      <CollectionSection
        title="Women's Collection"
        products={womenProducts}
        viewAllHref="/women"
        emptyTitle="Women's styles coming soon"
        emptyDescription="New arrivals are on the way — check back shortly."
      />

      <CollectionSection
        title="Men's Collection"
        products={menProducts}
        viewAllHref="/men"
        emptyTitle="Men's styles coming soon"
        emptyDescription="New arrivals are on the way — check back shortly."
      />

      <CollectionSection
        title="Kids' Collection"
        products={kidsProducts}
        viewAllHref="/kids"
        emptyTitle="Kids' styles coming soon"
        emptyDescription="New arrivals are on the way — check back shortly."
      />

      <CollectionSection
        title="Accessories"
        products={accessoriesProducts}
        viewAllHref="/accessories"
        emptyTitle="Accessories coming soon"
        emptyDescription="New arrivals are on the way — check back shortly."
      />

      <WhyUs />

      <RewardsTeaser />

      <section className="mt-16 rounded-[var(--radius-card)] bg-cream px-6 py-12 text-center md:px-14">
        <h2 className="text-2xl text-charcoal">Stay in the Loop</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-soft">
          Get early access to new arrivals, exclusive offers and style edits — straight to your inbox.
        </p>
        <div className="mx-auto mt-6 max-w-sm">
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
