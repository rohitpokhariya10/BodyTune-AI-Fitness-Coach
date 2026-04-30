import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/utils";

type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      ref={ref}
      role="separator"
      {...props}
    />
  ),
);

Separator.displayName = "Separator";
