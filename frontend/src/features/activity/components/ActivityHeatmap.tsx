import { AlertTriangle, CalendarDays } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { activityService } from "@/features/activity/services/activityService";
import type { ActivityDay } from "@/features/activity/types";
import { ActivityTooltip } from "@/features/activity/components/ActivityTooltip";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Skeleton } from "@/shared/ui/Skeleton";

const cellSize = 14;
const cellGap = 4;
const weekdayLabelWidth = 24;
const levelColors = [
  "var(--app-elevated-solid)",
  "hsl(var(--primary) / 0.18)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--primary) / 0.58)",
  "hsl(var(--primary) / 0.88)",
];

type TooltipState = {
  day: ActivityDay;
  x: number;
  y: number;
} | null;

type CalendarCell = {
  date: string;
  day: ActivityDay | null;
  isLeading: boolean;
  isTrailing: boolean;
  isToday: boolean;
};

type MonthLabel = {
  label: string;
  span: number;
  week: number;
};

function toLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildCalendarCells(activityDays: ActivityDay[], dayCount: number) {
  const activityByDate = new Map(activityDays.map((day) => [day.date, day]));
  const today = startOfToday();
  const rangeStart = addDays(today, -(dayCount - 1));
  const calendarStart = addDays(rangeStart, -rangeStart.getDay());
  const calendarEnd = addDays(today, 6 - today.getDay());
  const cells: CalendarCell[] = [];

  for (
    let date = calendarStart;
    date <= calendarEnd;
    date = addDays(date, 1)
  ) {
    const dateKey = toDateKey(date);
    const activityDay = activityByDate.get(dateKey);
    const isLeading = date < rangeStart;
    const isTrailing = date > today;

    cells.push({
      date: dateKey,
      day:
        isLeading || isTrailing
          ? null
          : activityDay ?? {
              count: 0,
              date: dateKey,
              diet_log_count: 0,
              level: 0,
              login_count: 0,
              video_watch_count: 0,
              workout_count: 0,
            },
      isLeading,
      isTrailing,
      isToday: dateKey === toDateKey(today),
    });
  }

  return cells;
}

function buildMonthLabels(cells: CalendarCell[]) {
  const labels: MonthLabel[] = [];
  let previousMonthKey = "";

  cells.forEach((cell, index) => {
    const date = toLocalDate(cell.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (!cell.isLeading && !cell.isTrailing && monthKey !== previousMonthKey) {
      const week = Math.floor(index / 7);
      const previousLabel = labels[labels.length - 1];

      if (previousLabel && previousLabel.week === week) {
        labels.pop();
      }

      labels.push({
        label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date),
        span: 1,
        week,
      });
      previousMonthKey = monthKey;
    }
  });

  labels.forEach((label, index) => {
    const nextLabel = labels[index + 1];
    label.span = Math.max(1, (nextLabel?.week ?? Math.ceil(cells.length / 7)) - label.week);
  });

  return labels;
}

function activityCountLabel(count: number) {
  return count === 1 ? "1 activity" : `${count} activities`;
}

function formatCellLabel(day: ActivityDay) {
  const formattedDate = formatFullDate(day.date);
  if (day.count === 0) {
    return `No activity on ${formattedDate}`;
  }

  return `${activityCountLabel(day.count)} on ${formattedDate}`;
}

function formatFullDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function buildWeekdayLabels() {
  return ["Mon", "Wed", "Fri"].map((label) => ({
    label,
    row: label === "Mon" ? 2 : label === "Wed" ? 4 : 6,
  }));
}

function HeatmapSkeleton() {
  return (
    <div className="thin-scrollbar overflow-x-auto pb-1">
      <div
        className="activity-heatmap-body"
        style={{ "--heatmap-label-width": `${weekdayLabelWidth}px` } as CSSProperties}
      >
        <div aria-hidden="true" />
        <div
          className="grid grid-flow-col"
          style={{
            gap: cellGap,
            gridAutoColumns: cellSize,
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
          }}
        >
          {Array.from({ length: 7 * 28 }).map((_, index) => (
            <Skeleton
              className="rounded-[4px] bg-white/[0.055]"
              key={index}
              style={{ height: cellSize, width: cellSize }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityHeatmap({
  compact = false,
  days = 365,
  showHeader = true,
  title = "Consistency Map",
}: {
  compact?: boolean;
  days?: number;
  showHeader?: boolean;
  title?: string;
}) {
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    activityService
      .getActivityHeatmap(days)
      .then((response) => {
        if (isMounted) {
          setActivityDays(response.days);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Activity data is unavailable. Confirm the backend is running.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [days]);

  const visibleDayCount = compact ? Math.min(days, 120) : days;
  const cells = useMemo(
    () => buildCalendarCells(activityDays, visibleDayCount),
    [activityDays, visibleDayCount],
  );
  const monthLabels = useMemo(() => buildMonthLabels(cells), [cells]);
  const weekdayLabels = useMemo(() => buildWeekdayLabels(), []);
  const hasActivity = cells.some((cell) => cell.day && cell.day.count > 0);
  const weekCount = Math.ceil(cells.length / 7);
  const gridTemplateColumns = `repeat(${weekCount}, ${cellSize}px)`;
  const gridWidth = weekCount * cellSize + Math.max(0, weekCount - 1) * cellGap;

  return (
    <GlassCard className="bento-card activity-heatmap-card p-4 sm:p-5" data-gsap="fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showHeader ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-white/48">
                {visibleDayCount} days of tracked effort
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-white/48">
            {visibleDayCount} days of tracked effort
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/45">
          <span>Less</span>
          {levelColors.map((color, index) => (
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-[3px] border border-white/10"
              key={color}
              style={{
                backgroundColor: color,
                boxShadow:
                  index === 4 ? "0 0 10px rgba(255, 107, 26, 0.36)" : undefined,
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <HeatmapSkeleton />
        ) : error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-ember-400/25 bg-ember-400/10 p-4 text-sm leading-6 text-ember-400">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="thin-scrollbar overflow-x-auto scroll-smooth pb-2">
              <div className="activity-heatmap-wrap">
                {monthLabels.length > 0 ? (
                  <div
                    aria-hidden="true"
                    className="activity-heatmap-month-row"
                    style={{ "--heatmap-label-width": `${weekdayLabelWidth}px` } as CSSProperties}
                  >
                    <div aria-hidden="true" />
                    <div
                      className="activity-heatmap-months"
                      style={{
                        gap: cellGap,
                        gridTemplateColumns,
                        width: gridWidth,
                      }}
                    >
                      {monthLabels.map((month) => (
                        <span
                          className="activity-heatmap-month-label"
                          key={`${month.label}-${month.week}`}
                          style={{
                            gridColumn: `${month.week + 1} / span ${month.span}`,
                          }}
                        >
                          {month.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  className="activity-heatmap-body min-w-max"
                  style={{ "--heatmap-label-width": `${weekdayLabelWidth}px` } as CSSProperties}
                >
                  <div
                    aria-hidden="true"
                    className="grid text-[10px] font-medium leading-none text-white/32"
                    style={{
                      gap: cellGap,
                      gridTemplateRows: `repeat(7, ${cellSize}px)`,
                    }}
                  >
                    {weekdayLabels.map((weekday) => (
                      <span
                        className="flex items-center"
                        key={weekday.label}
                        style={{ gridRowStart: weekday.row }}
                      >
                        {weekday.label}
                      </span>
                    ))}
                  </div>

                  <div
                    className="grid grid-flow-col"
                    style={{
                      gap: cellGap,
                      gridAutoColumns: cellSize,
                      gridTemplateRows: `repeat(7, ${cellSize}px)`,
                      width: gridWidth,
                    }}
                  >
                    {cells.map((cell) => {
                      if (!cell.day) {
                        return (
                          <span
                            aria-hidden="true"
                            className="activity-heatmap-cell activity-heatmap-cell--empty"
                            key={`empty-${cell.date}`}
                            style={{
                              "--heatmap-cell-color": "transparent",
                            } as CSSProperties}
                          />
                        );
                      }

                      return (
                        <button
                          aria-label={formatCellLabel(cell.day)}
                          className="activity-heatmap-cell"
                          key={cell.date}
                          onBlur={() => setTooltip(null)}
                          onFocus={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setTooltip({
                              day: cell.day as ActivityDay,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseEnter={(event) =>
                            setTooltip({
                              day: cell.day as ActivityDay,
                              x: event.clientX,
                              y: event.clientY,
                            })
                          }
                          onMouseLeave={() => setTooltip(null)}
                          onMouseMove={(event) =>
                            setTooltip({
                              day: cell.day as ActivityDay,
                              x: event.clientX,
                              y: event.clientY,
                            })
                          }
                          style={{
                            "--heatmap-cell-color": levelColors[cell.day.level],
                            "--heatmap-cell-glow":
                              cell.day.level === 4
                                ? "0 0 0 1px rgb(var(--theme-primary-rgb) / 0.18)"
                                : "none",
                            "--heatmap-today-ring": cell.isToday
                              ? "0 0 0 2px rgba(255, 255, 255, 0.34)"
                              : "none",
                          } as CSSProperties}
                          type="button"
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {!hasActivity ? (
              <p className="mt-3 text-sm leading-6 text-white/48">
                Start logging meals, workouts, or videos to build your consistency map.
              </p>
            ) : null}
          </>
        )}
      </div>

      {tooltip ? (
        <ActivityTooltip day={tooltip.day} x={tooltip.x} y={tooltip.y} />
      ) : null}
    </GlassCard>
  );
}
