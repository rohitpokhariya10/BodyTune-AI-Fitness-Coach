import { forwardRef, type LabelHTMLAttributes } from "react";

import { cn } from "@/shared/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      ref={ref}
      {...props}
    />
  ),
);

Label.displayName = "Label";
