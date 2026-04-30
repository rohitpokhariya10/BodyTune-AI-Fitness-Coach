import { AlertTriangle } from "lucide-react";

import { GlassCard } from "./GlassCard";

type ErrorStateProps = {
  title: string;
  description: string;
};

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <GlassCard className="border-ember-400/30 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ember-400/10 text-ember-400">
          <AlertTriangle aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </GlassCard>
  );
}
