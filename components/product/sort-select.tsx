"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "best_selling", label: "Best Selling" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating_desc", label: "Highest Rated" },
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "recommended";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "recommended") params.delete("sort");
    else params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm text-charcoal-soft">
      <span className="hidden sm:inline">Sort by</span>
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Sort products"
        className="h-10 rounded-lg border border-line bg-soft-white px-3 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
