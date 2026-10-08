"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

interface ProductGalleryProps {
  images: string[];
  productName: string;
  videoUrl?: string;
}

export function ProductGallery({ images, productName, videoUrl }: ProductGalleryProps) {
  const gallery = images.length > 0 ? images : ["/images/product-fallback.svg"];
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goTo = (index: number) => {
    setActiveIndex(((index % gallery.length) + gallery.length) % gallery.length);
  };

  return (
    <div>
      <div className="grid grid-cols-[64px_1fr] gap-3 md:grid-cols-[80px_1fr]">
        {/* Thumbnails */}
        <div className="no-scrollbar flex max-h-[520px] flex-col gap-2 overflow-y-auto md:max-h-[600px]">
          {gallery.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${gallery.length}`}
              aria-current={i === activeIndex}
              className={cn(
                "relative aspect-square shrink-0 overflow-hidden rounded-[var(--radius-card)] border bg-cream",
                i === activeIndex ? "border-gold" : "border-line"
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${productName} video`}
              className="flex aspect-square shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-line bg-charcoal text-soft-white"
            >
              <PlayCircle size={22} />
            </a>
          )}
        </div>

        {/* Main image */}
        <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-cream">
          <Image
            key={gallery[activeIndex]}
            src={gallery[activeIndex]}
            alt={`${productName} — image ${activeIndex + 1} of ${gallery.length}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-soft-white/90 text-charcoal shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-soft-white/90 text-charcoal shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="View fullscreen"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-soft-white/90 text-charcoal shadow-sm"
          >
            <Expand size={16} />
          </button>
        </div>
      </div>

      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${productName} — fullscreen gallery`}
      >
        <div className="relative aspect-square w-full">
          <Image
            src={gallery[activeIndex]}
            alt={`${productName} — image ${activeIndex + 1} of ${gallery.length}`}
            fill
            sizes="90vw"
            className="object-contain"
          />
        </div>
        {gallery.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous image"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-charcoal"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-charcoal-soft">
              {activeIndex + 1} / {gallery.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next image"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-charcoal"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
