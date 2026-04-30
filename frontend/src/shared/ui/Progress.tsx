import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/utils";

type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  indicatorClassName?: string;
  value?: number;
};

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, value = 0, ...props }, ref) => {
    const normalizedValue = Math.max(0, Math.min(100, value));

    return (
      <div
        className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80", className)}
        ref={ref}
        {...props}
      >
        <div
          className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)}
          style={{ width: `${normalizedValue}%` }}
        />
      </div>
    );
  },
);

Progress.displayName = "Progress";
