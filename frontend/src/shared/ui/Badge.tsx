import { cva, type VariantProps } from "class-variance-authority";
import { type HTMLAttributes } from "react";

import { cn } from "@/shared/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-transparent bg-primary/14 text-primary",
        active: "border-volt-400/28 bg-volt-400/12 text-volt-400 lime-glow",
        admin: "border-primary/28 bg-primary/12 text-primary",
        destructive: "border-destructive/25 bg-destructive/12 text-destructive",
        locked: "border-border bg-muted text-muted-foreground",
        nutrition: "border-nutrition/25 bg-nutrition/12 text-nutrition",
        outline: "border-border text-foreground",
        premium: "border-primary/28 bg-primary/12 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        selected: "border-primary/35 bg-primary/14 text-foreground orange-glow",
        user: "border-volt-400/28 bg-volt-400/12 text-volt-400",
        warning: "border-warning/25 bg-warning/12 text-warning",
      },
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ className, variant }))} {...props} />;
}
