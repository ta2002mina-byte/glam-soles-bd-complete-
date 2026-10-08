/**
 * Single source of truth for the site's canonical production URL.
 * Used by root/page metadata (canonical + Open Graph), sitemap.xml and
 * robots.txt so they never drift out of sync with each other.
 *
 * Falls back to a placeholder during local/preview builds where
 * NEXT_PUBLIC_SITE_URL hasn't been set yet — set it in production so
 * canonicals/sitemap/OG tags point at the real domain.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.glamsolesbd.com").replace(/\/+$/, "");

export const SITE_NAME = "Glam Soles BD";
export const SITE_TAGLINE = "STEP INTO YOUR BEST VIBE";
export const SITE_DESCRIPTION =
  "Premium footwear and accessories for women, men, and kids. Step into your best vibe with Glam Soles BD.";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Support contact details shown in the footer (Phase 11 trust/support row).
 * Placeholder numbers — replace with the real Glam Soles BD support line
 * before launch. Kept in one place so footer/contact page never drift.
 */
export const SUPPORT_PHONE_DISPLAY = "+880 1XXX-XXXXXX";
export const SUPPORT_PHONE_TEL = "+8801XXXXXXXXX";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/8801XXXXXXXXX";
export const SUPPORT_MESSENGER_URL = "https://m.me/glamsolesbd";
export const SUPPORT_EMAIL = "support@glamsolesbd.com";
