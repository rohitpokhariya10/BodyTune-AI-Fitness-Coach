import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/shared/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn(
        "focus-ring form-field flex w-full px-3 py-2 text-sm font-medium text-foreground shadow-inner-glass transition file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/65 hover:border-primary/35 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Input.displayName = "Input";
