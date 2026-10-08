import Link from "next/link";
import { getActiveBanners } from "@/lib/supabase/queries";

/**
 * Admin-editable via the `banners` CMS table (placement = 'announcement').
 * Falls back to a static message when no banner is currently active/
 * scheduled, so the bar is never blank.
 */
export async function AnnouncementBar() {
  const [banner] = await getActiveBanners("announcement");

  if (banner) {
    const content = (
      <p>
        {banner.title}
        {banner.subtitle ? <span className="ml-1 text-soft-white/80">{banner.subtitle}</span> : null}
        {banner.cta_text ? <span className="ml-1 font-medium text-gold-soft">{banner.cta_text}</span> : null}
      </p>
    );

    return (
      <div className="bg-charcoal py-2 text-center text-xs text-soft-white">
        {banner.cta_link ? (
          <Link href={banner.cta_link} className="hover:underline">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    );
  }

  return (
    <div className="bg-charcoal py-2 text-center text-xs text-soft-white">
      <p>
        Free shipping on orders above ৳2,500 — Use code{" "}
        <span className="font-medium text-gold-soft">WELCOME10</span> for 10% off
      </p>
    </div>
  );
}
