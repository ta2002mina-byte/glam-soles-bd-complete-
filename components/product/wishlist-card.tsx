"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import type { Product } from "@/types";
import { PriceDisplay } from "@/components/product/price-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";

interface WishlistCardProps {
  product: Product;
  isBackInStock: boolean;
  onRemove: () => void;
}

export function WishlistCard({ product, isBackInStock, onRemove }: WishlistCardProps) {
  const { addLine, openDrawer } = useCart();
  const variants = product.variants ?? [];
  const singleVariant = variants.length === 1 ? variants[0] : null;
  const outOfStock = product.inStock === false;

  function handleAddToCart() {
    if (!singleVariant || singleVariant.stock <= 0) return;
    addLine({
      productId: product.id,
      variantId: singleVariant.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? "/images/product-fallback.svg",
      color: singleVariant.color,
      size: singleVariant.size,
      unitPrice: singleVariant.priceOverride ?? product.price,
      quantity: 1,
    });
    openDrawer();
  }

  return (
    <div className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-soft-white p-4">
      <Link href={`/product/${product.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-cream">
        {product.images[0] && (
          <Image src={product.images[0]} alt={product.name} fill sizes="100px" className="object-cover" />
        )}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal-soft/70">{product.subcategory}</p>
            <Link href={`/product/${product.slug}`} className="text-sm font-medium text-charcoal hover:underline">
              {product.name}
            </Link>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${product.name} from wishlist`}
            className="text-charcoal-soft/60 hover:text-blush-deep"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-1">
          <PriceDisplay price={product.price} oldPrice={product.oldPrice} discountPercent={product.discountPercent} />
        </div>

        {product.colors.length > 1 && (
          <div className="mt-1 flex items-center gap-1" aria-label={`Available in ${product.colors.length} colors`}>
            {product.colors.slice(0, 5).map((color) => (
              <span
                key={color}
                title={color}
                className="h-3 w-3 rounded-full border border-line"
                style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
              />
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {outOfStock ? (
            <Badge variant="outline">Currently unavailable</Badge>
          ) : (
            isBackInStock && <Badge variant="gold">Back in Stock</Badge>
          )}
          {!outOfStock && product.discountPercent && <Badge variant="blush">Price Drop</Badge>}
        </div>

        <div className="mt-3">
          {outOfStock ? (
            <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
              Currently unavailable
            </Button>
          ) : singleVariant ? (
            <Button size="sm" onClick={handleAddToCart} className="w-full sm:w-auto">
              <ShoppingBag size={15} /> Add to Cart
            </Button>
          ) : (
            <Link
              href={`/product/${product.slug}`}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-charcoal px-4 text-sm font-medium text-charcoal hover:bg-charcoal hover:text-soft-white"
              )}
            >
              Select Options
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
