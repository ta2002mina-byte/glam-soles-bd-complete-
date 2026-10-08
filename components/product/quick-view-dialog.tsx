"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/components/providers/cart-provider";
import { ColorSelector } from "@/components/product/color-selector";
import { SizeSelector } from "@/components/product/size-selector";
import { RatingStars } from "@/components/product/rating-stars";
import { PriceDisplay } from "@/components/product/price-display";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Phase 4 — "without a full page reload" product preview from a listing
 * grid. Deliberately reuses the already-fetched listing `Product` (which
 * already embeds variants/stock from the same query that rendered the
 * card) rather than a fresh fetch, so opening it is instant.
 */
export function QuickViewDialog({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const { addLine, openDrawer } = useCart();

  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const hasVariants = variants.length > 0;

  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [attempted, setAttempted] = useState(false);

  const sizesForSelectedColor = useMemo(() => {
    if (!hasVariants) return [];
    const relevant = selectedColor ? variants.filter((v) => v.color === selectedColor) : variants;
    const uniqueSizes = Array.from(new Set(relevant.map((v) => v.size)));
    return uniqueSizes.map((size) => ({ size, available: relevant.some((v) => v.size === size && v.stock > 0) }));
  }, [variants, selectedColor, hasVariants]);

  const unavailableColors = useMemo(
    () => product.colors.filter((color) => variants.filter((v) => v.color === color).every((v) => v.stock <= 0)),
    [product.colors, variants]
  );

  const selectedVariant = useMemo(
    () => (hasVariants ? variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null : null),
    [variants, selectedColor, selectedSize, hasVariants]
  );

  const requiresSelection = hasVariants;
  const selectionComplete = !requiresSelection || Boolean(selectedVariant);
  const isOutOfStock = hasVariants ? (selectedVariant ? selectedVariant.stock <= 0 : product.inStock === false) : true;
  const canAddToCart = selectionComplete && !isOutOfStock;

  function handleClose() {
    setSelectedColor(product.colors[0] ?? null);
    setSelectedSize(null);
    setStatus("idle");
    setAttempted(false);
    onClose();
  }

  function handleAddToCart() {
    if (status === "adding") return; // duplicate-click prevention
    if (!canAddToCart || !selectedVariant) {
      setAttempted(true);
      return;
    }
    setStatus("adding");
    addLine({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? "/images/product-fallback.svg",
      color: selectedColor ?? "",
      size: selectedSize ?? "",
      unitPrice: selectedVariant.priceOverride ?? product.price,
      quantity: 1,
    });
    openDrawer();
    window.setTimeout(() => setStatus("added"), 250);
    window.setTimeout(() => {
      setStatus("idle");
      handleClose();
    }, 1200);
  }

  return (
    <Dialog open={open} onClose={handleClose} title={`Quick view — ${product.name}`} className="max-w-2xl">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-cream">
          {product.images[0] && (
            <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 640px) 90vw, 320px" className="object-cover" />
          )}
        </div>

        <div>
          {product.brand && <p className="text-xs uppercase tracking-wide text-charcoal-soft/70">{product.brand}</p>}
          <h2 className="mt-1 pr-8 text-xl text-charcoal">{product.name}</h2>

          {product.rating !== undefined && (
            <div className="mt-2">
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            </div>
          )}

          <div className="mt-3">
            <PriceDisplay price={product.price} oldPrice={product.oldPrice} discountPercent={product.discountPercent} />
          </div>

          {hasVariants && (
            <div className="mt-4 space-y-4">
              <ColorSelector
                colors={product.colors}
                selected={selectedColor}
                unavailableColors={unavailableColors}
                onSelect={(color) => {
                  setSelectedColor(color);
                  setSelectedSize(null);
                  setAttempted(false);
                }}
              />
              <SizeSelector
                sizes={sizesForSelectedColor}
                selected={selectedSize}
                onSelect={(size) => {
                  setSelectedSize(size);
                  setAttempted(false);
                }}
              />
            </div>
          )}

          {attempted && !canAddToCart && (
            <p role="alert" className="mt-3 text-sm text-blush-deep">
              {isOutOfStock ? "Currently unavailable" : "Please select a color and size."}
            </p>
          )}

          <Button type="button" className="mt-5 w-full" disabled={status === "adding" || (attempted && isOutOfStock)} onClick={handleAddToCart}>
            {status === "added" ? (
              <>
                <Check size={16} aria-hidden="true" /> Added to bag
              </>
            ) : status === "adding" ? (
              "Adding…"
            ) : (
              <>
                <ShoppingBag size={16} aria-hidden="true" /> Add to Cart
              </>
            )}
          </Button>

          <Link
            href={`/product/${product.slug}`}
            className="mt-3 block text-center text-sm font-medium text-charcoal underline-offset-2 hover:underline"
            onClick={handleClose}
          >
            View full details
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
