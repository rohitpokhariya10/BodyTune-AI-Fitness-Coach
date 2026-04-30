import { LoaderCircle } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft-panel">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading experience</span>
      </div>
    </div>
  );
}
