import { type ReactNode, useState } from "react";

import { cn } from "@/shared/utils";

type DropdownMenuProps = {
  children: (state: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) => ReactNode;
};

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  return <>{children({ isOpen, setIsOpen })}</>;
}

export function DropdownMenuContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute right-0 top-full z-50 mt-2 min-w-44 rounded-lg border border-border bg-card p-1 shadow-premium",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-9 w-full items-center rounded-md px-2 text-left text-sm text-foreground transition hover:bg-muted",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
