import { Inbox } from "lucide-react";

import { GlassCard } from "./GlassCard";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <GlassCard className="p-8 text-center sm:p-10">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <Inbox aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </GlassCard>
  );
}
