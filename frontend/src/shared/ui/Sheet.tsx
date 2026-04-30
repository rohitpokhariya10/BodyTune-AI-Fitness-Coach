import { X } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils";

type SheetProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function Sheet({ children, isOpen, onOpenChange }: SheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-carbon-950/72 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function SheetContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "absolute inset-y-0 left-0 w-[min(22rem,88vw)] border-r border-white/[0.08] bg-card p-4 shadow-premium",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SheetClose({ onClick }: { onClick: () => void }) {
  return (
    <Button
      aria-label="Close navigation"
      className="absolute right-3 top-3"
      onClick={onClick}
      size="icon"
      variant="ghost"
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}
