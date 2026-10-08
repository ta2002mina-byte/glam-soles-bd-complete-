"use server";

import { getSearchSuggestions } from "@/lib/supabase/queries";
import type { SearchSuggestion } from "@/lib/supabase/queries";

/**
 * Debounced search-autocomplete dropdown data (header search + /search
 * page). This is the one part of Phase 4 that genuinely needs a
 * client-driven fetch without navigation — everything else (category
 * filters, sort, pagination) is plain URL/searchParams-driven server
 * rendering, so changing a filter is a normal (fast, RSC-streamed)
 * navigation rather than a second data-fetching path to keep in sync.
 */
export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestion> {
  if (typeof query !== "string" || query.length > 200) return { products: [], categories: [], brands: [] };
  return getSearchSuggestions(query);
}
