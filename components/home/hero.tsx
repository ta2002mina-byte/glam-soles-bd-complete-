import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DbBanner } from "@/types/database";

export function Hero({ banner }: { banner: DbBanner | null }) {
  if (banner && (banner.desktop_image_url || banner.mobile_image_url)) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-blush">
        <div className="relative aspect-[4/5] w-full md:hidden">
          {banner.mobile_image_url && (
            <Image
              src={banner.mobile_image_url}
              alt={banner.title ?? "Glam Soles BD"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <HeroOverlay banner={banner} />
        </div>
        <div className="relative hidden aspect-[16/7] w-full md:block">
          {banner.desktop_image_url && (
            <Image
              src={banner.desktop_image_url}
              alt={banner.title ?? "Glam Soles BD"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <HeroOverlay banner={banner} />
        </div>
      </section>
    );
  }

  // Fallback: static editorial hero (no admin banner configured yet).
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-blush px-6 py-14 md:px-14 md:py-20">
      <p className="font-display text-3xl leading-tight text-charcoal md:text-5xl">
        Step Into
        <br />
        <span className="italic">Your Best Vibe</span>
      </p>
      <p className="mt-4 max-w-md text-sm text-charcoal-soft md:text-base">
        Premium footwear for every journey — style, comfort, confidence.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/women" className={cn(buttonVariants({ size: "lg" }))}>
          Shop Now
        </Link>
        <Link href="/search?sort=newest" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
          New Arrivals
        </Link>
      </div>
    </section>
  );
}

function HeroOverlay({ banner }: { banner: DbBanner }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-charcoal/60 via-charcoal/10 to-transparent p-6 md:p-14">
      {banner.title && (
        <p className="font-display text-2xl leading-tight text-soft-white md:text-4xl">{banner.title}</p>
      )}
      {banner.subtitle && <p className="mt-2 max-w-md text-sm text-soft-white/90">{banner.subtitle}</p>}
      {banner.cta_text && banner.cta_link && (
        <Link href={banner.cta_link} className={cn(buttonVariants({ size: "lg" }), "mt-5 w-fit")}>
          {banner.cta_text}
        </Link>
      )}
    </div>
  );
}
