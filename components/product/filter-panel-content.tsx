"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ProductListingFilterOptions } from "@/lib/supabase/queries";

export interface PendingFilters {
  subcategory: string;
  brands: string[];
  colors: string[];
  sizes: string[];
  priceMin: string;
  priceMax: string;
  discount: boolean;
  inStock: boolean;
  minRating: number;
}

function readFiltersFromParams(params: URLSearchParams): PendingFilters {
  return {
    subcategory: params.get("subcategory") ?? "",
    brands: (params.get("brand") ?? "").split(",").filter(Boolean),
    colors: (params.get("color") ?? "").split(",").filter(Boolean),
    sizes: (params.get("size") ?? "").split(",").filter(Boolean),
    priceMin: params.get("price_min") ?? "",
    priceMax: params.get("price_max") ?? "",
    discount: params.get("discount") === "1",
    inStock: params.get("instock") === "1",
    minRating: Number(params.get("rating") ?? "0") || 0,
  };
}

/** Count of active filters (excludes sort/page/q), for the "Filters (n)" mobile button and active-state styling. */
export function countActiveFilters(params: URLSearchParams): number {
  const f = readFiltersFromParams(params);
  return (
    (f.subcategory ? 1 : 0) +
    f.brands.length +
    f.colors.length +
    f.sizes.length +
    (f.priceMin ? 1 : 0) +
    (f.priceMax ? 1 : 0) +
    (f.discount ? 1 : 0) +
    (f.inStock ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0)
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanelContent({
  options,
  onApplied,
}: {
  options: ProductListingFilterOptions;
  onApplied?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<PendingFilters>(() => readFiltersFromParams(searchParams));

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) => (value ? params.set(key, value) : params.delete(key));

    set("subcategory", pending.subcategory);
    set("brand", pending.brands.join(","));
    set("color", pending.colors.join(","));
    set("size", pending.sizes.join(","));
    set("price_min", pending.priceMin);
    set("price_max", pending.priceMax);
    set("discount", pending.discount ? "1" : "");
    set("instock", pending.inStock ? "1" : "");
    set("rating", pending.minRating > 0 ? String(pending.minRating) : "");
    params.delete("page"); // filters change → back to page 1

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onApplied?.();
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["subcategory", "brand", "color", "size", "price_min", "price_max", "discount", "instock", "rating", "page"]) {
      params.delete(key);
    }
    setPending({ subcategory: "", brands: [], colors: [], sizes: [], priceMin: "", priceMax: "", discount: false, inStock: false, minRating: 0 });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onApplied?.();
  }

  return (
    <div className="space-y-6">
      {options.subcategories.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">Category</legend>
          <div className="mt-2 space-y-1.5">
            {options.subcategories.map((sub) => (
              <label key={sub.slug} className="flex items-center gap-2 text-sm text-charcoal-soft">
                <input
                  type="radio"
                  name="subcategory"
                  checked={pending.subcategory === sub.slug}
                  onChange={() => setPending((p) => ({ ...p, subcategory: sub.slug }))}
                />
                {sub.name}
              </label>
            ))}
            {pending.subcategory && (
              <button
                type="button"
                onClick={() => setPending((p) => ({ ...p, subcategory: "" }))}
                className="text-xs text-charcoal underline underline-offset-2"
              >
                Clear category
              </button>
            )}
          </div>
        </fieldset>
      )}

      {options.brands.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">Brand</legend>
          <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
            {options.brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm text-charcoal-soft">
                <input
                  type="checkbox"
                  checked={pending.brands.includes(b.id)}
                  onChange={() => setPending((p) => ({ ...p, brands: toggle(p.brands, b.id) }))}
                />
                {b.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {options.sizes.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">Size</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.sizes.map((size) => {
              const active = pending.sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPending((p) => ({ ...p, sizes: toggle(p.sizes, size) }))}
                  className={`min-w-9 rounded-[var(--radius-pill)] border px-2.5 py-1.5 text-xs ${
                    active ? "border-charcoal bg-charcoal text-soft-white" : "border-line text-charcoal-soft hover:border-charcoal"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {options.colors.length > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.colors.map((color) => {
              const active = pending.colors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-pressed={active}
                  aria-label={color}
                  onClick={() => setPending((p) => ({ ...p, colors: toggle(p.colors, color) }))}
                  className={`h-8 w-8 rounded-full border-2 ${active ? "border-gold" : "border-line"}`}
                  style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
                />
              );
            })}
          </div>
        </fieldset>
      )}

      {options.priceMax > 0 && (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">
            Price range (৳{options.priceMin.toLocaleString("en-BD")}–{options.priceMax.toLocaleString("en-BD")})
          </legend>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              value={pending.priceMin}
              onChange={(e) => setPending((p) => ({ ...p, priceMin: e.target.value }))}
              className="h-9 w-full rounded-lg border border-line bg-soft-white px-2.5 text-sm text-charcoal"
            />
            <span className="text-charcoal-soft">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              value={pending.priceMax}
              onChange={(e) => setPending((p) => ({ ...p, priceMax: e.target.value }))}
              className="h-9 w-full rounded-lg border border-line bg-soft-white px-2.5 text-sm text-charcoal"
            />
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">More filters</legend>
        <label className="flex items-center gap-2 text-sm text-charcoal-soft">
          <input type="checkbox" checked={pending.discount} onChange={(e) => setPending((p) => ({ ...p, discount: e.target.checked }))} />
          On sale
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal-soft">
          <input type="checkbox" checked={pending.inStock} onChange={(e) => setPending((p) => ({ ...p, inStock: e.target.checked }))} />
          In stock only
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-wide text-charcoal">Rating</legend>
        <div className="mt-2 space-y-1.5">
          {[4, 3, 2, 1].map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-charcoal-soft">
              <input
                type="radio"
                name="rating"
                checked={pending.minRating === r}
                onChange={() => setPending((p) => ({ ...p, minRating: r }))}
              />
              {r}+ stars
            </label>
          ))}
          {pending.minRating > 0 && (
            <button
              type="button"
              onClick={() => setPending((p) => ({ ...p, minRating: 0 }))}
              className="text-xs text-charcoal underline underline-offset-2"
            >
              Clear rating
            </button>
          )}
        </div>
      </fieldset>

      <div className="flex gap-2 border-t border-line pt-4">
        <Button type="button" onClick={apply} className="flex-1">
          Apply Filters
        </Button>
        <Button type="button" variant="outline" onClick={clearAll}>
          Clear all
        </Button>
      </div>
    </div>
  );
}
