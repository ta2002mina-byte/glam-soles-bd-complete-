"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import {
  addFeaturedProduct,
  removeFeaturedProduct,
  searchProductsForFeaturing,
  toggleFeaturedProduct,
} from "@/app/actions/admin/cms";
import type { FeaturedProductRow, ProductSearchResult } from "@/types/admin";

export function FeaturedProductsPanel({ initialFeatured }: { initialFeatured: FeaturedProductRow[] }) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initialFeatured);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function handleQueryChange(value: string) {
    setQuery(value);
    clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const found = await searchProductsForFeaturing(value);
      setResults(found.filter((p) => !featured.some((f) => f.productId === p.id)));
      setIsSearching(false);
    }, 300);
  }

  async function handleAdd(product: ProductSearchResult) {
    setResults((prev) => prev.filter((p) => p.id !== product.id));
    const result = await addFeaturedProduct(product.id);
    if (result.status === "ok") {
      // A featured_products row has its own id, distinct from the product's.
      // Refresh from the server rather than guessing it — inventing one here
      // would leave later remove/toggle calls pointing at a row that
      // doesn't exist.
      setQuery("");
      router.refresh();
    }
  }

  async function handleRemove(id: string) {
    setFeatured((prev) => prev.filter((f) => f.id !== id));
    await removeFeaturedProduct(id);
  }

  async function handleToggle(id: string, isActive: boolean) {
    setFeatured((prev) => prev.map((f) => (f.id === id ? { ...f, isActive } : f)));
    await toggleFeaturedProduct(id, isActive);
  }

  return (
    <div>
      <div className="relative max-w-sm">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-soft/60" />
        <Input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search products to feature…"
          className="pl-9"
        />
      </div>

      {query && (
        <div className="mt-2 max-w-sm rounded-lg border border-line bg-soft-white">
          {isSearching ? (
            <p className="px-3 py-2 text-sm text-charcoal-soft">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-charcoal-soft">No matches.</p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleAdd(product)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-cream"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-cream">
                  <Image src={product.image} alt="" fill sizes="36px" className="object-cover" />
                </div>
                <span className="text-sm text-charcoal">{product.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="mt-4">
        {featured.length === 0 ? (
          <EmptyState title="No featured products yet." description="Search above to add one." />
        ) : (
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-soft-white">
            {featured.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-cream">
                  <Image src={item.productImage} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <p className="flex-1 text-sm font-medium text-charcoal">{item.productName}</p>
                <Switch checked={item.isActive} onCheckedChange={(v) => handleToggle(item.id, v)} label={`Show ${item.productName}`} />
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.productName}`}
                  className="text-charcoal-soft/60 hover:text-blush-deep"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
