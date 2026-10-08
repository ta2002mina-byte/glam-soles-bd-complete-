import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}

export function Pagination({ basePath, searchParams, page, pageSize, total }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-6 flex items-center justify-between text-sm text-charcoal-soft">
      <p>
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "rounded-lg border border-line px-3 py-1.5",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-cream"
          )}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "rounded-lg border border-line px-3 py-1.5",
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-cream"
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
