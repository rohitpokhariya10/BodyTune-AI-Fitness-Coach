import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({
  title,
  eyebrow,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="page-header flex flex-col gap-5 rounded-[1.35rem] border border-border p-5 shadow-soft-panel sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
