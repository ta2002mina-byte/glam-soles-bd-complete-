"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import type { Product } from "@/types";
import { PriceDisplay } from "./price-display";
import { RatingStars } from "./rating-stars";
import { WishlistButton } from "./wishlist-button";
import { QuickViewDialog } from "./quick-view-dialog";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const hoverImage = product.images[1];

  return (
    <>
      <Link
        href={`/product/${product.slug}`}
        className="group block overflow-hidden rounded-[var(--radius-card)] bg-soft-white"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-cream">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={
                hoverImage
                  ? "object-cover transition-opacity duration-300 group-hover:opacity-0"
                  : "object-cover transition-transform duration-300 group-hover:scale-105"
              }
            />
          )}
          {hoverImage && (
            <Image
              src={hoverImage}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNew && <Badge variant="charcoal">New</Badge>}
            {product.discountPercent !== undefined && (
              <Badge variant="blush">-{product.discountPercent}%</Badge>
            )}
          </div>

          <WishlistButton productId={product.id} className="absolute right-3 top-3" />

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setQuickViewOpen(true);
            }}
            className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] bg-charcoal/90 py-2 text-xs font-medium text-soft-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:flex"
          >
            <Eye size={14} aria-hidden="true" />
            Quick View
          </button>

          {product.inStock === false && (
            <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-soft-white">
              Currently unavailable
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className="text-xs uppercase tracking-wide text-charcoal-soft/70">
            {product.subcategory}
          </p>
          <h3 className="truncate font-sans text-sm font-medium text-charcoal">
            {product.name}
          </h3>
          {product.rating !== undefined && (
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          )}
          {product.colors.length > 1 && (
            <div className="flex items-center gap-1" aria-label={`Available in ${product.colors.length} colors`}>
              {product.colors.slice(0, 5).map((color) => (
                <span
                  key={color}
                  title={color}
                  className="h-3 w-3 rounded-full border border-line"
                  style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-[10px] text-charcoal-soft/70">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
          <PriceDisplay
            price={product.price}
            oldPrice={product.oldPrice}
            discountPercent={product.discountPercent}
          />
        </div>
      </Link>

      <QuickViewDialog product={product} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </>
  );
}
