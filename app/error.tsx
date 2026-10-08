"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-boutique flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-3xl text-charcoal">Something went wrong</h1>
      <p className="max-w-sm text-sm text-charcoal-soft">
        Please try again. If the problem continues, contact support.
      </p>
      <button onClick={() => reset()} className={cn(buttonVariants({ size: "md" }))}>
        Try again
      </button>
    </div>
  );
}
