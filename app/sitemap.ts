import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";
import { getAllPublishedProductSlugs } from "@/lib/supabase/queries";

// Phase 11 — SEO foundation. Static storefront routes + every published
// product, generated at request time so newly published products appear
// without a redeploy. Cart/checkout/account/admin are intentionally
// excluded (see app/robots.ts).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/women`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/men`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/kids`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/accessories`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/track-order`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/rewards`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/shipping-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/returns`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/size-guide`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const products = await getAllPublishedProductSlugs();
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
