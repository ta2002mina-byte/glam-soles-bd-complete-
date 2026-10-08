import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        gold: "bg-gold text-soft-white",
        blush: "bg-blush text-charcoal",
        charcoal: "bg-charcoal text-soft-white",
        outline: "border border-line text-charcoal-soft",
      },
    },
    defaultVariants: { variant: "blush" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
