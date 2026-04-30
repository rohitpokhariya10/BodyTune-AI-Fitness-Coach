import { motion, type HTMLMotionProps } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/utils";

type PremiumButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
  icon?: LucideIcon;
  to?: string;
  variant?: "primary" | "secondary" | "ghost" | "selected";
};

const variantStyles = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  selected: "selected-card border text-foreground",
};

export function PremiumButton({
  children,
  className = "",
  icon: Icon,
  to,
  variant = "primary",
  type = "button",
  ...props
}: PremiumButtonProps) {
  const isDisabled = Boolean(props.disabled);
  const content = (
    <>
      <span className="absolute inset-y-0 left-[-45%] w-[38%] -skew-x-12 bg-white/28 opacity-0 transition duration-500 group-hover:left-[115%] group-hover:opacity-100" />
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
      <span className="relative z-10">{children}</span>
    </>
  );

  const baseClassName = cn(
    "focus-ring group relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-bold tracking-normal transition disabled:cursor-not-allowed disabled:opacity-45",
    variantStyles[variant],
    isDisabled && "disabled-state",
    className,
  );

  if (to) {
    return (
      <motion.div whileHover={{ scale: 1.025 }} whileTap={{ scale: 0.98 }}>
        <Link className={baseClassName} to={to}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      className={baseClassName}
      type={type}
      whileHover={isDisabled ? undefined : { scale: 1.025 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      {...props}
    >
      {content}
    </motion.button>
  );
}
