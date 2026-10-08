import Link from "next/link";
import { cn } from "@/lib/utils";

export function ListingPagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={cn(
          "rounded-[var(--radius-pill)] border border-line px-4 py-2 text-sm",
          page <= 1 ? "pointer-events-none opacity-40" : "text-charcoal hover:bg-cream"
        )}
      >
        Previous
      </Link>
      <span className="text-sm text-charcoal-soft">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= totalPages}
        className={cn(
          "rounded-[var(--radius-pill)] border border-line px-4 py-2 text-sm",
          page >= totalPages ? "pointer-events-none opacity-40" : "text-charcoal hover:bg-cream"
        )}
      >
        Next
      </Link>
    </nav>
  );
}
