import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-boutique grid grid-cols-2 gap-4 py-10 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] w-full" />
      ))}
    </div>
  );
}
