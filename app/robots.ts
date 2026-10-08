import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

// Phase 11 — SEO foundation. Storefront browsing/catalog stays crawlable;
// account, checkout, cart and API routes carry personal/session data and
// are excluded so they never show up in search results. /admin isn't part
// of this phase's scope but is blocked defensively regardless.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/cart",
          "/checkout",
          "/order-success",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
