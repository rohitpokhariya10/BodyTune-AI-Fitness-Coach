import { Activity, CalendarCheck2, Flame, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { activityService } from "@/features/activity/services/activityService";
import type { ActivitySummary } from "@/features/activity/types";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Skeleton } from "@/shared/ui/Skeleton";

function SummarySkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <GlassCard className="bento-card p-5" key={index}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-16" />
        </GlassCard>
      ))}
    </>
  );
}

export function StreakSummaryCards() {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    activityService
      .getActivitySummary()
      .then((response) => {
        if (isMounted) {
          setSummary(response);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Could not load streak stats.");
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
  }, []);

  const cards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        icon: Flame,
        label: "Current streak",
        tone: "text-primary",
        value: `${summary.current_streak}d`,
      },
      {
        icon: Trophy,
        label: "Longest streak",
        tone: "text-volt-400",
        value: `${summary.longest_streak}d`,
      },
      {
        icon: CalendarCheck2,
        label: "Active days",
        tone: "text-primary",
        value: String(summary.total_active_days),
      },
      {
        icon: Activity,
        label: "Today",
        tone: "text-primary",
        value: String(summary.today_activity_count),
      },
    ];
  }, [summary]);

  if (isLoading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummarySkeleton />
      </section>
    );
  }

  if (error || !summary) {
    return (
      <GlassCard className="bento-card p-5">
        <p className="text-sm text-ember-400">{error}</p>
      </GlassCard>
    );
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <GlassCard className="bento-card p-5" data-gsap="card" key={card.label}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {card.value}
                </p>
              </div>
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ${card.tone}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
          </GlassCard>
        );
      })}
    </section>
  );
}
