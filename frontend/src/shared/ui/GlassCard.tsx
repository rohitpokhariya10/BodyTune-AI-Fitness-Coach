import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils";

type GlassCardProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  interactive?: boolean;
  variant?: "default" | "interactive" | "selected" | "disabled";
};

export function GlassCard({
  children,
  className = "",
  interactive = false,
  variant = "default",
  ...props
}: GlassCardProps) {
  const isInteractive = interactive || variant === "interactive";

  return (
    <motion.div
      className={cn(
        "glass-surface premium-card rounded-2xl transition duration-200",
        isInteractive && "interactive-card",
        variant === "selected" && "selected-card",
        variant === "disabled" && "disabled-state",
        className,
      )}
      whileHover={
        isInteractive && variant !== "disabled"
          ? {
              y: -2,
              scale: 1.002,
              transition: { duration: 0.18, ease: "easeOut" },
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
