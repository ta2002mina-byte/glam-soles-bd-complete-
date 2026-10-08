import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="container-boutique py-8 md:py-12">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-6 h-11 w-full max-w-lg" />
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-full" />
        ))}
      </div>
    </div>
  );
}
