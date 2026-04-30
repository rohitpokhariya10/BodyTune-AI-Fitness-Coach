import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import type { ActivityDay } from "@/features/activity/types";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

function activityLabel(count: number) {
  return count === 1 ? "1 activity" : `${count} activities`;
}

export function ActivityTooltip({
  day,
  x,
  y,
}: {
  day: ActivityDay;
  x: number;
  y: number;
}) {
  const style: CSSProperties = {
    left:
      typeof window === "undefined"
        ? x + 12
        : Math.max(12, Math.min(x + 12, window.innerWidth - 244)),
    top:
      typeof window === "undefined"
        ? y - 10
        : Math.max(12, Math.min(y - 14, window.innerHeight - 184)),
  };
  const formattedDate = formatDate(day.date);

  const tooltip = (
    <div
      className="activity-heatmap-tooltip pointer-events-none fixed w-52 rounded-lg border border-primary/45 bg-black/95 p-3 text-xs shadow-premium backdrop-blur-xl"
      style={style}
      role="tooltip"
    >
      <p className="font-semibold text-white">{formattedDate}</p>
      <p className="mt-1 text-white/64">
        {day.count > 0 ? activityLabel(day.count) : "No activity"}
      </p>
    </div>
  );

  if (typeof document === "undefined") {
    return tooltip;
  }

  return createPortal(tooltip, document.body);
}
