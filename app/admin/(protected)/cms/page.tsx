import { requireAdminRole } from "@/lib/supabase/admin-guard";
import {
  getFeaturedProductsForAdmin,
  getHomepageSectionsForAdmin,
  getTestimonialsForAdmin,
} from "@/lib/supabase/admin-queries";
import { HomepageSectionsPanel } from "@/components/admin/homepage-sections-panel";
import { FeaturedProductsPanel } from "@/components/admin/featured-products-panel";
import { TestimonialsPanel } from "@/components/admin/testimonials-panel";

export default async function AdminCmsPage() {
  await requireAdminRole("manager");
  const [sections, featured, testimonials] = await Promise.all([
    getHomepageSectionsForAdmin(),
    getFeaturedProductsForAdmin(),
    getTestimonialsForAdmin(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl text-charcoal">Homepage CMS</h1>
        <p className="mt-1 text-sm text-charcoal-soft">
          Control what shows on the homepage — announcement, hero and other banners live under Banners.
        </p>
      </div>

      <section>
        <h2 className="font-display text-lg text-charcoal">Sections</h2>
        <p className="mt-1 text-sm text-charcoal-soft">Show, hide, and reorder the homepage&apos;s sections.</p>
        <div className="mt-3">
          <HomepageSectionsPanel initialSections={sections} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-charcoal">Featured Products</h2>
        <p className="mt-1 text-sm text-charcoal-soft">
          Hand-picked products for the Featured Products section (separate from the automatic New Arrivals / Best
          Sellers).
        </p>
        <div className="mt-3">
          <FeaturedProductsPanel initialFeatured={featured} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-charcoal">Testimonials</h2>
        <p className="mt-1 text-sm text-charcoal-soft">Customer quotes shown in the Testimonials section.</p>
        <div className="mt-3">
          <TestimonialsPanel initialTestimonials={testimonials} />
        </div>
      </section>
    </div>
  );
}
