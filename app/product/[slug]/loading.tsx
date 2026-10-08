import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailsLoading() {
  return (
    <div className="container-boutique grid gap-8 py-8 md:grid-cols-2 md:gap-10 md:py-12">
      <div className="grid grid-cols-[64px_1fr] gap-3 md:grid-cols-[80px_1fr]">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
