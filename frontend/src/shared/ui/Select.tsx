import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/shared/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "focus-ring flex min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-inner-glass transition hover:border-primary/35 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = "Select";
