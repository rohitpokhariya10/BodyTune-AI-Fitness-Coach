import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { cn } from "@/shared/utils";

type ToastProps = {
  message: string;
  title?: string;
  variant?: "default" | "success" | "warning" | "destructive";
};

const toastStyles = {
  default: "border-border bg-card text-foreground",
  destructive: "border-destructive/25 bg-destructive/12 text-destructive",
  success: "border-primary/25 bg-primary/12 text-primary",
  warning: "border-warning/25 bg-warning/12 text-warning",
};

const toastIcons = {
  default: Info,
  destructive: TriangleAlert,
  success: CheckCircle2,
  warning: TriangleAlert,
};

export function Toast({ message, title, variant = "default" }: ToastProps) {
  const Icon = toastIcons[variant];

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-3 text-sm", toastStyles[variant])}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className="leading-6 opacity-90">{message}</p>
      </div>
    </div>
  );
}
