"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag, Heart } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { ProductGallery } from "@/components/product/product-gallery";
import { ColorSelector } from "@/components/product/color-selector";
import { SizeSelector } from "@/components/product/size-selector";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { RatingStars } from "@/components/product/rating-stars";
import { PriceDisplay } from "@/components/product/price-display";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ProductDetailInteractive({ product }: { product: Product }) {
  const router = useRouter();
  const { addLine, openDrawer } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const hasVariants = variants.length > 0;

  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [attemptedWithoutSelection, setAttemptedWithoutSelection] = useState(false);

  const sizesForSelectedColor = useMemo(() => {
    if (!hasVariants) return [];
    const relevant = selectedColor
      ? variants.filter((v) => v.color === selectedColor)
      : variants;
    const uniqueSizes = Array.from(new Set(relevant.map((v) => v.size)));
    return uniqueSizes.map((size) => ({
      size,
      available: relevant.some((v) => v.size === size && v.stock > 0),
    }));
  }, [variants, selectedColor, hasVariants]);

  const unavailableColors = useMemo(() => {
    return product.colors.filter((color) => variants.filter((v) => v.color === color).every((v) => v.stock <= 0));
  }, [product.colors, variants]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null;
  }, [variants, selectedColor, selectedSize, hasVariants]);

  const requiresSelection = hasVariants;
  const selectionComplete = !requiresSelection || Boolean(selectedVariant);
  const currentStock = hasVariants ? selectedVariant?.stock ?? 0 : 0;
  // Every sellable line references a real product_variants row (cart_items
  // and order_items both have a NOT NULL variant_id FK) — a product with no
  // variants at all has no SKU to actually sell, so it's always treated as
  // unavailable rather than silently falling back to the product's own id.
  const isOutOfStock = hasVariants ? (selectedVariant ? selectedVariant.stock <= 0 : product.inStock === false) : true;
  const canAddToCart = selectionComplete && !isOutOfStock;

  const displayImages =
    (hasVariants && selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images) ?? [];

  const displayPrice = selectedVariant?.priceOverride ?? product.price;

  function buildCartLine() {
    // Only called once canAddToCart is true, which guarantees a real
    // selectedVariant — never fabricate a variant id from product.id.
    if (!selectedVariant) return null;
    return {
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      image: displayImages[0] ?? "/images/product-fallback.svg",
      color: selectedColor ?? "",
      size: selectedSize ?? "",
      unitPrice: displayPrice,
      quantity,
    };
  }

  function handleAddToCart() {
    if (status === "adding") return; // prevent duplicate-click double add
    const line = canAddToCart ? buildCartLine() : null;
    if (!line) {
      setAttemptedWithoutSelection(true);
      return;
    }
    setStatus("adding");
    addLine(line);
    openDrawer();
    window.setTimeout(() => setStatus("added"), 250);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  function handleBuyNow() {
    const line = canAddToCart && status !== "adding" ? buildCartLine() : null;
    if (!line) {
      setAttemptedWithoutSelection(true);
      return;
    }
    setStatus("adding");
    addLine(line);
    router.push("/checkout");
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10">
      <ProductGallery images={displayImages} productName={product.name} videoUrl={product.videoUrl} />

      <div>
        {product.brand && (
          <p className="text-xs uppercase tracking-wide text-charcoal-soft/70">{product.brand}</p>
        )}
        <h1 className="mt-1 text-2xl text-charcoal md:text-3xl">{product.name}</h1>
        {product.sku && <p className="mt-1 text-xs text-charcoal-soft/60">SKU: {selectedVariant?.sku ?? product.sku}</p>}

        {product.rating !== undefined && (
          <div className="mt-2">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          </div>
        )}

        <div className="mt-4">
          <PriceDisplay price={displayPrice} oldPrice={product.oldPrice} discountPercent={product.discountPercent} />
        </div>

        <div className="mt-6 space-y-5">
          {hasVariants && product.colors.length > 0 && (
            <ColorSelector
              colors={product.colors}
              selected={selectedColor}
              unavailableColors={unavailableColors}
              onSelect={(color) => {
                setSelectedColor(color);
                setSelectedSize(null);
                setQuantity(1);
              }}
            />
          )}

          {hasVariants && sizesForSelectedColor.length > 0 && (
            <SizeSelector
              sizes={sizesForSelectedColor}
              selected={selectedSize}
              onSelect={(size) => {
                setSelectedSize(size);
                setQuantity(1);
              }}
              onOpenSizeGuide={() => setSizeGuideOpen(true)}
            />
          )}

          {attemptedWithoutSelection && !selectionComplete && (
            <p role="alert" className="text-sm text-blush-deep">
              Please select a color and size to continue.
            </p>
          )}

          {isOutOfStock && selectionComplete && (
            <p role="status" className="text-sm font-medium text-blush-deep">
              Currently unavailable
            </p>
          )}

          {!isOutOfStock && hasVariants && selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
            <p className="text-xs text-gold">Only {selectedVariant.stock} left in stock</p>
          )}

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-soft">Quantity</p>
            <div className="mt-2">
              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                max={Math.max(currentStock, 1)}
                disabled={!canAddToCart}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 hidden gap-3 md:flex">
          <Button
            size="lg"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={status === "adding" || isOutOfStock}
            aria-disabled={!canAddToCart}
          >
            {status === "added" ? (
              <>
                <Check size={18} /> Added
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> Add to Cart
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1"
            onClick={handleBuyNow}
            disabled={status === "adding" || isOutOfStock}
          >
            Buy Now
          </Button>
          <button
            type="button"
            onClick={() => toggle(product.id)}
            aria-pressed={isWishlisted(product.id)}
            aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-line"
          >
            <Heart
              size={18}
              className={cn(isWishlisted(product.id) ? "fill-blush-deep text-blush-deep" : "text-charcoal")}
            />
          </button>
        </div>
      </div>

      {/* Mobile sticky Add to Cart bar (Phase 11) — sits above the sticky
          bottom nav (z-30) so both stay usable and reachable with a thumb. */}
      <div className="fixed inset-x-0 bottom-16 z-20 flex items-center gap-3 border-t border-line bg-soft-white/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-pressed={isWishlisted(product.id)}
          aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-pill)] border border-line"
        >
          <Heart
            size={18}
            className={cn(isWishlisted(product.id) ? "fill-blush-deep text-blush-deep" : "text-charcoal")}
          />
        </button>
        <Button
          size="lg"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={status === "adding" || isOutOfStock}
          aria-disabled={!canAddToCart}
        >
          {status === "added" ? (
            <>
              <Check size={18} /> Added
            </>
          ) : (
            <>
              <ShoppingBag size={18} /> {isOutOfStock ? "Unavailable" : "Add to Cart"}
            </>
          )}
        </Button>
      </div>

      <Dialog open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} title="Size Guide">
        <h2 className="text-lg text-charcoal">Size Guide</h2>
        <p className="mt-2 text-sm text-charcoal-soft">
          Sizes shown are EU sizing. If you are between sizes, we recommend
          sizing up for a comfortable fit.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-charcoal-soft">
              <th className="py-2">EU</th>
              <th className="py-2">UK</th>
              <th className="py-2">Foot length (cm)</th>
            </tr>
          </thead>
          <tbody className="text-charcoal">
            {[
              ["36", "3", "23.0"],
              ["37", "4", "23.5"],
              ["38", "5", "24.5"],
              ["39", "6", "25.0"],
              ["40", "7", "25.5"],
              ["41", "8", "26.5"],
            ].map(([eu, uk, cmv]) => (
              <tr key={eu} className="border-b border-line">
                <td className="py-2">{eu}</td>
                <td className="py-2">{uk}</td>
                <td className="py-2">{cmv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Dialog>
    </div>
  );
}
