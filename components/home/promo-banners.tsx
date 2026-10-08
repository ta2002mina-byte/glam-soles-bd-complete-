import Image from "next/image";
import Link from "next/link";
import type { DbBanner } from "@/types/database";

/**
 * Renders currently active/scheduled promo banners from the CMS `banners`
 * table (placement = 'promo'). Renders nothing if there are no active
 * campaigns — never hardcodes a fake "Eid Sale" or similar as real data.
 */
export function PromoBanners({ banners }: { banners: DbBanner[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="mt-14">
      <div className={banners.length > 1 ? "grid gap-4 md:grid-cols-2" : ""}>
        {banners.map((banner) => (
          <Link
            key={banner.id}
            href={banner.cta_link ?? "/search"}
            className="group relative block overflow-hidden rounded-[var(--radius-card)] bg-cream"
          >
            <div className="relative aspect-[16/9]">
              {banner.desktop_image_url ? (
                <Image
                  src={banner.desktop_image_url}
                  alt={banner.title ?? "Promotion"}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-blush">
                  <p className="font-display text-xl text-charcoal">{banner.title}</p>
                </div>
              )}
            </div>
            {(banner.title || banner.subtitle || banner.cta_text) && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-charcoal/70 to-transparent p-5">
                {banner.title && <p className="font-display text-xl text-soft-white">{banner.title}</p>}
                {banner.subtitle && <p className="mt-1 text-sm text-soft-white/90">{banner.subtitle}</p>}
                {banner.cta_text && (
                  <span className="mt-2 w-fit text-xs font-medium uppercase tracking-wide text-gold-soft">
                    {banner.cta_text} →
                  </span>
                )}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
