"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { FilterPanelContent, countActiveFilters } from "./filter-panel-content";
import type { ProductListingFilterOptions } from "@/lib/supabase/queries";

export function ProductFilters({ options }: { options: ProductListingFilterOptions }) {
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = countActiveFilters(searchParams);

  const hasAnyOptions =
    options.subcategories.length > 0 ||
    options.brands.length > 0 ||
    options.colors.length > 0 ||
    options.sizes.length > 0 ||
    options.priceMax > 0;

  if (!hasAnyOptions) return null;

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line px-4 py-2 text-sm font-medium text-charcoal lg:hidden"
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-[11px] text-soft-white">
            {activeCount}
          </span>
        )}
      </button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" className="max-w-sm">
        <FilterPanelContent options={options} onApplied={() => setDrawerOpen(false)} />
      </Drawer>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <h2 className="mb-4 font-display text-lg text-charcoal">Filters</h2>
        <FilterPanelContent options={options} />
      </aside>
    </>
  );
}
