import { CheckCircle2, ShieldCheck, UserRound } from "lucide-react";

import { cn } from "@/shared/utils";

type AuthRoleSegmentedControlProps<TMode extends "user" | "admin"> = {
  className?: string;
  onChange: (mode: TMode) => void;
  value: TMode;
};

const roleOptions = [
  {
    icon: UserRound,
    label: "User Account",
    value: "user",
  },
  {
    icon: ShieldCheck,
    label: "Admin Account",
    value: "admin",
  },
] as const;

export function AuthRoleSegmentedControl<TMode extends "user" | "admin">({
  className,
  onChange,
  value,
}: AuthRoleSegmentedControlProps<TMode>) {
  return (
    <div
      aria-label="Choose account type"
      className={cn(
        "grid grid-cols-2 gap-1.5 rounded-full border border-border bg-[var(--app-subtle)] p-1 shadow-inner-glass",
        className,
      )}
      role="tablist"
    >
      {roleOptions.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.value;

        return (
          <button
            aria-selected={isActive}
            className={cn(
              "focus-ring inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-3 text-sm font-bold transition duration-200",
              "hover:-translate-y-0.5 active:translate-y-0",
              isActive
                ? "border-primary/50 bg-[image:var(--button-primary-bg)] text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.1),inset_0_1px_0_rgba(255,255,255,0.12)]"
                : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-[var(--app-subtle-hover)] hover:text-foreground",
            )}
            key={item.value}
            onClick={() => onChange(item.value as TMode)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {isActive ? (
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
