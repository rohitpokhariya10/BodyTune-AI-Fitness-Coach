import { X } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils";

type DialogProps = {
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function Dialog({ children, isOpen, onOpenChange }: DialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-950/72 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-lg">{children}</div>
    </div>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-surface rounded-2xl p-6 shadow-premium", className)}>
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 space-y-1.5">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

export function DialogClose({ onClick }: { onClick: () => void }) {
  return (
    <Button
      aria-label="Close dialog"
      className="absolute right-3 top-3"
      onClick={onClick}
      size="icon"
      variant="ghost"
    >
      <X aria-hidden="true" className="h-4 w-4" />
    </Button>
  );
}
