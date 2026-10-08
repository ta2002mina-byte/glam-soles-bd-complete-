"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Clock, TrendingUp, X } from "lucide-react";
import { fetchSearchSuggestions } from "@/app/actions/catalog";
import { formatBDT } from "@/lib/utils";
import type { SearchSuggestion } from "@/lib/supabase/queries";

const RECENT_SEARCHES_KEY = "glamsoles:recent-searches";
const MAX_RECENT = 5;
const POPULAR_SEARCHES = ["Heels", "Sneakers", "Sandals", "Loafers", "New Arrivals", "Sale"];

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  const existing = readRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase());
  const next = [term, ...existing].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing etc.) — recent searches just won't persist
  }
}

export function SearchAutocomplete({
  autoFocus,
  placeholder = "Search for shoes, brands, styles...",
  onNavigate,
}: {
  autoFocus?: boolean;
  placeholder?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion>({ products: [], categories: [], brands: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());
  const [isPending, startTransition] = useTransition();

  // Debounced autocomplete fetch — the "too short, clear results" branch is
  // deferred through the same timer as the real fetch (rather than an
  // early-return setState at the top of the effect) so every state update
  // this effect makes happens outside its own synchronous call stack.
  useEffect(() => {
    const query = value.trim();
    const timer = setTimeout(() => {
      if (query.length < 2) {
        setSuggestions({ products: [], categories: [], brands: [] });
        return;
      }
      startTransition(async () => {
        const result = await fetchSearchSuggestions(query);
        setSuggestions(result);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function go(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setRecentSearches(readRecentSearches());
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(value);
  }

  const showEmptyState = value.trim().length < 2;
  const hasResults = suggestions.products.length > 0 || suggestions.categories.length > 0 || suggestions.brands.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-soft" aria-hidden="true" />
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label="Search products"
          className="h-12 w-full rounded-[var(--radius-pill)] border border-line bg-soft-white pl-10 pr-10 text-sm text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-soft hover:text-charcoal"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-soft-white p-4 shadow-lg">
          {showEmptyState ? (
            <div className="space-y-5">
              {recentSearches.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                    <Clock size={13} aria-hidden="true" /> Recent searches
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => go(term)}
                        className="rounded-full border border-line px-3 py-1.5 text-xs text-charcoal-soft hover:bg-cream"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                  <TrendingUp size={13} aria-hidden="true" /> Popular searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => go(term)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-charcoal-soft hover:bg-cream"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isPending && !hasResults ? (
            <p className="py-4 text-center text-sm text-charcoal-soft">Searching…</p>
          ) : !hasResults ? (
            <p className="py-4 text-center text-sm text-charcoal-soft">No matches for &quot;{value}&quot; yet.</p>
          ) : (
            <div className="space-y-4">
              {suggestions.products.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Products</p>
                  <div className="space-y-1">
                    {suggestions.products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/product/${p.slug}`}
                        onClick={() => {
                          saveRecentSearch(value);
                          setRecentSearches(readRecentSearches());
                          setOpen(false);
                          onNavigate?.();
                        }}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-cream"
                      >
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-cream">
                          {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                        </div>
                        <span className="flex-1 truncate text-sm text-charcoal">{p.name}</span>
                        <span className="text-sm text-charcoal-soft">{formatBDT(p.price)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {(suggestions.categories.length > 0 || suggestions.brands.length > 0) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Categories &amp; brands</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.categories.map((c) => (
                      <button key={c.slug} type="button" onClick={() => go(c.name)} className="rounded-full border border-line px-3 py-1.5 text-xs text-charcoal-soft hover:bg-cream">
                        {c.name}
                      </button>
                    ))}
                    {suggestions.brands.map((b) => (
                      <button key={b.slug} type="button" onClick={() => go(b.name)} className="rounded-full border border-line px-3 py-1.5 text-xs text-charcoal-soft hover:bg-cream">
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" onClick={() => go(value)} className="text-sm font-medium text-charcoal underline underline-offset-2">
                See all results for &quot;{value}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
