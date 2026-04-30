import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/shared/utils";

const cardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground shadow-soft-panel transition",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-border",
        disabled:
          "disabled-state border-border bg-muted/55 text-muted-foreground",
        interactive:
          "interactive-card text-card-foreground hover:-translate-y-0.5",
        selected: "selected-card",
      },
    },
  },
);

export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      className={cn(cardVariants({ className, variant }))}
      ref={ref}
      {...props}
    />
  ),
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("flex flex-col gap-2 p-5 sm:p-6", className)} ref={ref} {...props} />
  ),
);

CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      className={cn("font-display text-lg font-bold leading-tight tracking-normal", className)}
      ref={ref}
      {...props}
    />
  ),
);

CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p className={cn("text-sm leading-6 text-muted-foreground", className)} ref={ref} {...props} />
));

CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} ref={ref} {...props} />
  ),
);

CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("flex items-center p-5 pt-0 sm:p-6 sm:pt-0", className)} ref={ref} {...props} />
  ),
);

CardFooter.displayName = "CardFooter";
