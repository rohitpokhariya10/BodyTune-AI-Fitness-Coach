import type { LucideIcon } from "lucide-react";

import { GlassCard } from "./GlassCard";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  accent: "aqua" | "volt" | "ember";
  icon: LucideIcon;
};

const accentStyles = {
  aqua: "text-aqua-400 bg-aqua-400/10",
  volt: "text-volt-400 bg-volt-400/10",
  ember: "text-primary bg-primary/10",
};

export function StatCard({
  label,
  value,
  helper,
  accent,
  icon: Icon,
}: StatCardProps) {
  return (
    <GlassCard interactive className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentStyles[accent]}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{helper}</p>
    </GlassCard>
  );
}
