import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border border-line bg-soft-white px-4 text-sm text-charcoal placeholder:text-charcoal-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
