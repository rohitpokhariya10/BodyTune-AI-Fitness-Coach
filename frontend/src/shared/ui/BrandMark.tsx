import { Logo } from "@/shared/ui/Logo";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
  isAdmin?: boolean;
};

export function BrandMark({
  className = "",
  compact = false,
  isAdmin = false,
}: BrandMarkProps) {
  return (
    <Logo
      className={className}
      compact={compact}
      subtitle={isAdmin ? "Admin workspace" : "Training workspace"}
    />
  );
}
