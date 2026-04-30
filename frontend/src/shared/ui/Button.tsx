import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/shared/utils";

export const buttonVariants = cva(
  "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold tracking-normal transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "px-4 py-2",
        icon: "h-10 w-10",
        lg: "min-h-12 px-5 py-3 text-[0.95rem]",
        sm: "min-h-9 px-3 py-1.5 text-xs",
      },
      variant: {
        default: "btn-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
        ghost: "btn-ghost",
        outline: "btn-outline",
        premium: "btn-primary",
        secondary: "btn-secondary",
        selected: "selected-card border text-foreground",
        success: "btn-success focus-ring-success",
      },
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, type = "button", variant, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ className, size, variant }))}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
