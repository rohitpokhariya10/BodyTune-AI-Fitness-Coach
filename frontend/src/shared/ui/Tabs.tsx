import { createContext, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/shared/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Tabs({
  children,
  className,
  defaultValue,
  onValueChange,
  value,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeValue = value ?? internalValue;
  const contextValue = useMemo(
    () => ({
      setValue: (nextValue: string) => {
        setInternalValue(nextValue);
        onValueChange?.(nextValue);
      },
      value: activeValue,
    }),
    [activeValue, onValueChange],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex min-h-11 items-center rounded-2xl border border-border bg-card/70 p-1 shadow-inner-glass",
        className,
      )}
      role="tablist"
      {...props}
    />
  );
}

type TabsTriggerProps = HTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({
  children,
  className,
  value,
  ...props
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used inside Tabs");
  }

  const isActive = context.value === value;

  return (
    <button
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "focus-ring inline-flex min-h-9 items-center justify-center rounded-xl border border-transparent px-4 text-sm font-bold text-muted-foreground transition hover:border-primary/20 hover:bg-primary/[0.055] hover:text-foreground",
        isActive && "selected-tab",
        className,
      )}
      onClick={() => context.setValue(value)}
      role="tab"
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) {
    return null;
  }

  return <div className={cn("mt-4", className)} role="tabpanel" {...props} />;
}

export type { ReactNode as TabsReactNode };
