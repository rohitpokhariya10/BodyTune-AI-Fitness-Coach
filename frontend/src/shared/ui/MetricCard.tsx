import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-soft-panel">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
