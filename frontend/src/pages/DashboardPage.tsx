import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Dumbbell,
  Flame,
  Library,
  LoaderCircle,
  MessageSquareText,
  Plus,
  Repeat2,
  Salad,
  Trophy,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { ApiClientError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Progress } from "@/shared/ui/Progress";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ActivityHeatmap } from "@/features/activity/components/ActivityHeatmap";
import { dashboardService } from "@/features/dashboard/services/dashboardService";
import type {
  DashboardSummary,
  WorkoutSessionSummary,
} from "@/features/dashboard/types";

const quickActions = [
  {
    description: "Track meals and calories",
    icon: Utensils,
    label: "Log Food",
    to: "/diet",
  },
  {
    description: "Begin your live session",
    icon: Dumbbell,
    label: "Start Workout",
    to: "/workouts",
  },
  {
    description: "Browse guided exercises",
    icon: Library,
    label: "View Library",
    to: "/library",
  },
];

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function workoutLabel(value: string) {
  return value.replace("_", "-");
}

function sessionFeedback(session: WorkoutSessionSummary) {
  return session.primary_feedback || "Saved workout session";
}

function QuickActionCard({
  description,
  icon: Icon,
  label,
  to,
}: {
  description: string;
  icon: LucideIcon;
  label: string;
  to: string;
}) {
  return (
    <Link
      className="focus-ring group grid min-h-28 grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[1.25rem] border border-border bg-card/75 p-4 text-left shadow-soft-panel transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-[var(--theme-primary-soft)] sm:min-h-32 sm:p-5"
      to={to}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary shadow-inner-glass transition duration-200 group-hover:border-primary/35 group-hover:bg-primary/16">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-bold leading-tight text-foreground sm:text-lg">
          {label}
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground transition duration-200 group-hover:border-primary/30 group-hover:bg-primary/12 group-hover:text-primary">
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await dashboardService.getSummary());
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Unable to load dashboard data. Start the backend and retry.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const chartData = useMemo(() => {
    const sessions = summary?.workouts.recent_sessions ?? [];
    return [...sessions].reverse().map((session, index) => ({
      form: session.form_score,
      name: sessions.length > 1 ? formatDate(session.created_at) : `S${index + 1}`,
      reps: session.total_reps,
    }));
  }, [summary?.workouts.recent_sessions]);

  if (isLoading) {
    return (
      <GlassCard className="flex min-h-[420px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-white/62">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          Loading dashboard
        </div>
      </GlassCard>
    );
  }

  if (error || !summary) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-lg font-semibold text-white">Dashboard unavailable</p>
        <p className="mt-2 text-sm text-white/52">
          {error ?? "The dashboard summary could not be loaded."}
        </p>
        <PremiumButton className="mt-6" icon={ArrowRight} onClick={() => void loadDashboard()}>
          Retry
        </PremiumButton>
      </GlassCard>
    );
  }

  const { activity, insight, nutrition, subscription, user, workouts } = summary;
  const calorieGoal = nutrition.goal_is_set ? nutrition.calorie_goal : null;
  const hasCalorieGoal = calorieGoal !== null;
  const calorieProgress = hasCalorieGoal
    ? Math.min(100, (nutrition.total_calories / calorieGoal) * 100)
    : 0;
  const macroSummary = [
    {
      color: "bg-volt-400",
      label: "Protein",
      target: nutrition.protein_goal_g,
      unit: "g",
      value: nutrition.total_protein_g,
    },
    {
      color: "bg-primary",
      label: "Carbs",
      target: nutrition.carbs_goal_g,
      unit: "g",
      value: nutrition.total_carbs_g,
    },
    {
      color: "bg-primary",
      label: "Fats",
      target: nutrition.fats_goal_g,
      unit: "g",
      value: nutrition.total_fats_g,
    },
  ];
  const statCards = [
    {
      icon: Trophy,
      label: "Current streak",
      tone: "text-volt-400",
      value: `${activity.current_streak} day${activity.current_streak === 1 ? "" : "s"}`,
    },
    {
      icon: Flame,
      label: "Avg form score",
      tone: "text-primary",
      value: `${workouts.average_form_score}%`,
    },
    {
      icon: Repeat2,
      label: "Total reps",
      tone: "text-primary",
      value: String(workouts.total_reps),
    },
  ];

  return (
    <div className="app-page" ref={scopeRef}>
      <section className="dashboard-grid">
        <GlassCard
          className="orange-glow-card col-span-12 overflow-hidden p-5 sm:p-6 xl:col-span-8"
          data-gsap="slide-left"
        >
          <div className="grid gap-6 lg:grid-cols-[0.78fr_1fr] lg:items-center">
            <div>
              <Badge>Training workspace</Badge>
              <h1 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">
                Welcome back, {user.name}.
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Track meals, workouts, activity, and premium training from one
                calm command center.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <PremiumButton icon={Plus} to="/diet">
                  Log Food
                </PremiumButton>
                <PremiumButton icon={Dumbbell} to="/workouts" variant="secondary">
                  Start Workout
                </PremiumButton>
              </div>
            </div>

            <div className="surface-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {hasCalorieGoal ? "Calories remaining" : "Calories logged"}
                  </p>
                  <p className="mt-2 font-display text-5xl font-bold leading-none text-white">
                    {hasCalorieGoal
                      ? formatNumber(nutrition.calories_remaining ?? 0)
                      : formatNumber(nutrition.total_calories)}
                  </p>
                </div>
                <div className="text-right">
                  {hasCalorieGoal ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(nutrition.total_calories)} /{" "}
                        {calorieGoal}
                      </p>
                      <Badge variant="outline">
                        {Math.round(calorieProgress)}% consumed
                      </Badge>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        No calorie goal set
                      </p>
                      <PremiumButton className="mt-2" to="/profile" variant="secondary">
                        Set Goal
                      </PremiumButton>
                    </>
                  )}
                </div>
              </div>
              {hasCalorieGoal ? (
                <Progress
                  className="mt-5 h-3"
                  indicatorClassName="bg-primary"
                  value={calorieProgress}
                />
              ) : (
                <p className="mt-5 text-sm text-white/56">
                  Set your goal in Profile to track calories.{" "}
                  {formatNumber(nutrition.total_calories)} kcal logged today.
                </p>
              )}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {macroSummary.map((macro) => (
                  <div
                    className="stat-tile p-3"
                    key={macro.label}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {macro.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(macro.value)}
                        {macro.unit}
                        {macro.target !== null
                          ? ` / ${macro.target}${macro.unit}`
                          : ""}
                      </p>
                    </div>
                    {macro.target !== null ? (
                      <Progress
                        className="mt-3 h-2"
                        indicatorClassName={macro.color}
                        value={(macro.value / macro.target) * 100}
                      />
                    ) : (
                      <p className="mt-3 text-xs text-white/42">
                        No target set
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="col-span-12 grid gap-4 sm:grid-cols-3 xl:col-span-4 xl:grid-cols-1">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard className="bento-card p-4 sm:p-5" data-gsap="card" interactive key={stat.label}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 font-display text-3xl font-bold text-white">
                      {stat.value}
                    </p>
                  </div>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ${stat.tone}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Longest streak", activity.longest_streak],
          ["Active days", activity.total_active_days],
          ["Today activity", activity.today_activity_count],
          ["Meals today", nutrition.meals_logged_today],
          [
            "Subscription",
            subscription.status === "active" ? subscription.plan_name : "Free",
          ],
        ].map(([label, value]) => (
          <GlassCard className="bento-card p-4 sm:p-5" data-gsap="card" key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
          </GlassCard>
        ))}
      </section>

      <section className="space-y-3" data-gsap="fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge>Activity Streak</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold text-white">
              Daily consistency
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your streak grows when you log in, track food, finish workouts, or
              watch training videos.
            </p>
          </div>
        </div>
        <ActivityHeatmap days={365} showHeader={false} title="Activity Heatmap" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <GlassCard className="bento-card p-4 sm:p-5" data-gsap="slide-left">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Progress analytics
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Reps and form quality from saved sessions.
              </p>
            </div>
            <Badge variant="secondary">Real sessions</Badge>
          </div>
          {chartData.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                description="Start a live session to see form trends."
                title="No workout sessions yet"
              />
            </div>
          ) : (
            <div className="mt-6 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={chartData} margin={{ left: -18, right: 8 }}>
                  <defs>
                    <linearGradient id="repsGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="formGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--theme-secondary)" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="var(--theme-secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{ fill: "rgba(247,250,246,0.52)", fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: "rgba(247,250,246,0.52)", fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(8,12,10,0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Area
                    dataKey="reps"
                    fill="url(#repsGradient)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Area
                    dataKey="form"
                    fill="url(#formGradient)"
                    stroke="var(--theme-secondary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard className="bento-card p-4 sm:p-5" data-gsap="slide-right">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareText aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">
            {insight.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {insight.message}
          </p>
          <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/10 p-4">
            <p className="text-xs text-muted-foreground">Focus area</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {insight.focus_area}
            </p>
          </div>
        </GlassCard>
      </section>

      <section className="space-y-4 py-1" data-gsap="fade-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Quick actions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump into the workflows you use most.
            </p>
          </div>
        </div>
        <nav aria-label="Dashboard quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <QuickActionCard
              description={action.description}
              icon={action.icon}
              key={action.label}
              label={action.label}
              to={action.to}
            />
          ))}
        </nav>
      </section>

      <section className="space-y-3" data-gsap="fade-up">
        <h2 className="text-xl font-semibold text-white">Recent workouts</h2>
        {workouts.recent_sessions.length > 0 ? (
          <div className="grid gap-3">
            {workouts.recent_sessions.map((workout) => (
              <GlassCard className="bento-card p-5" data-gsap="card" interactive key={workout.id}>
                <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold capitalize text-white">
                      {workoutLabel(workout.workout_type)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sessionFeedback(workout)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(workout.created_at)}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {workout.total_reps} reps
                  </p>
                  <Badge>{workout.form_score}% form</Badge>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Start a live session to see form trends."
            title="No workout sessions yet"
          />
        )}
      </section>

      {nutrition.meals_logged_today === 0 && workouts.total_sessions === 0 ? (
        <GlassCard className="bento-card p-5" data-gsap="fade-up">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Salad aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Start with one signal</h2>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Start by logging a meal or completing a workout.
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
