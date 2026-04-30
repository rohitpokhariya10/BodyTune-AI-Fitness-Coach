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
  CheckCircle2,
  Filter,
  LoaderCircle,
  MessageSquareText,
  Repeat2,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { ApiClientError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GlassCard } from "@/shared/ui/GlassCard";
import { MetricCard } from "@/shared/ui/MetricCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/Tabs";
import { resultsService } from "@/features/results/services/resultsService";
import type { WorkoutResultRead } from "@/features/workouts/types";

type ResultFilter = "all" | string;

function formScore(result: WorkoutResultRead) {
  return result.total_reps > 0
    ? Math.round((result.correct_reps / result.total_reps) * 100)
    : 0;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
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

export default function ResultsPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const [results, setResults] = useState<WorkoutResultRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setResults(await resultsService.getMyResults());
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 404) {
        setResults([]);
      } else {
        setError("Unable to load workout history. Start the backend and retry.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  const orderedResults = useMemo(
    () =>
      [...results].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      ),
    [results],
  );
  const latestResult = orderedResults[0] ?? null;
  const bestSession = useMemo(
    () =>
      orderedResults.reduce<WorkoutResultRead | null>((best, result) => {
        if (!best || formScore(result) > formScore(best)) {
          return result;
        }
        return best;
      }, null),
    [orderedResults],
  );
  const totalDuration = results.reduce(
    (total, result) => total + result.duration_seconds,
    0,
  );
  const totalReps = results.reduce((total, result) => total + result.total_reps, 0);
  const correctReps = results.reduce(
    (total, result) => total + result.correct_reps,
    0,
  );
  const incorrectReps = results.reduce(
    (total, result) => total + result.incorrect_reps,
    0,
  );
  const chartData = [...orderedResults]
    .reverse()
    .slice(-6)
    .map((result) => ({
      form: formScore(result),
      name: formatDate(result.created_at),
      reps: result.total_reps,
    }));
  const workoutFilters = useMemo(
    () => Array.from(new Set(orderedResults.map((result) => result.workout_type))),
    [orderedResults],
  );

  function renderResultList(filter: ResultFilter) {
    const filteredResults =
      filter === "all"
        ? orderedResults
        : orderedResults.filter((result) => result.workout_type === filter);

    if (filteredResults.length === 0) {
      return (
        <EmptyState
          description="Complete a session to see progress."
          title="No workout data yet"
        />
      );
    }

    return (
      <div className="grid gap-3">
        {filteredResults.map((workout) => (
          <GlassCard className="bento-card p-5" data-gsap="card" interactive key={workout.id}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <p className="font-semibold capitalize text-white">
                  {workoutLabel(workout.workout_type)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {workout.primary_feedback || "Saved workout session"}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(workout.created_at)}
              </span>
              <span className="text-sm font-semibold text-white">
                {workout.total_reps} reps
              </span>
              <Badge>{formScore(workout)}% form</Badge>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <GlassCard className="flex min-h-[420px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-white/62">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          Loading results
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-lg font-semibold text-white">Results unavailable</p>
        <p className="mt-2 text-sm text-white/52">{error}</p>
      </GlassCard>
    );
  }

  return (
    <div className="app-page" ref={scopeRef}>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.72fr]">
        <GlassCard className="orange-glow-card p-5 sm:p-6" data-gsap="slide-left">
          <Badge>Results</Badge>
          <h1 className="mt-4 font-display text-3xl font-bold text-white">
            Session history and form trends
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review saved workout sessions from the backend, with empty states
            when no sessions exist yet.
          </p>
        </GlassCard>

        <GlassCard className="bento-card p-5 sm:p-6" data-gsap="slide-right">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Best session</p>
              <h2 className="font-display text-xl font-bold capitalize text-white">
                {bestSession
                  ? `${workoutLabel(bestSession.workout_type)} - ${formScore(bestSession)}%`
                  : "No sessions yet"}
              </h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {bestSession?.primary_feedback ??
              "Complete a workout to identify your strongest session."}
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div data-gsap="card">
          <MetricCard icon={Timer} label="Duration" value={formatDuration(totalDuration)} />
        </div>
        <div data-gsap="card">
          <MetricCard icon={Repeat2} label="Total reps" value={String(totalReps)} />
        </div>
        <div data-gsap="card">
          <MetricCard icon={CheckCircle2} label="Correct reps" value={String(correctReps)} />
        </div>
        <div data-gsap="card">
          <MetricCard icon={XCircle} label="Incorrect reps" value={String(incorrectReps)} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="bento-card p-5 sm:p-6" data-gsap="slide-left">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">Score trend</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reps and form score over recent saved sessions.
              </p>
            </div>
            <Badge variant="outline">Last 6 sessions</Badge>
          </div>
          {chartData.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                description="Complete a session to see progress."
                title="No workout data yet"
              />
            </div>
          ) : (
            <div className="mt-6 h-72">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={chartData} margin={{ left: -18, right: 8 }}>
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
                      background: "rgba(9,9,9,0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      color: "#fff",
                    }}
                  />
                  <Area
                    dataKey="form"
                    fill="rgb(var(--theme-secondary-rgb) / 0.16)"
                    stroke="var(--theme-secondary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Area
                    dataKey="reps"
                    fill="hsl(var(--primary) / 0.16)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard className="bento-card p-5 sm:p-6" data-gsap="slide-right">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquareText aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Trainer feedback
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest saved session notes.
              </p>
            </div>
          </div>
          <p className="mt-6 text-base leading-7 text-muted-foreground">
            {latestResult?.primary_feedback ??
              "No backend workout feedback yet. Complete a session to save form notes."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(latestResult?.feedback_tags ?? []).length > 0 ? (
              (latestResult?.feedback_tags ?? []).map((tag) => (
                <Badge key={tag} variant="warning">
                  {tag.replace("_", " ")}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">No focus tags yet</Badge>
            )}
          </div>
        </GlassCard>
      </section>

      <Tabs defaultValue="all" data-gsap="fade-up">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto">
          <TabsTrigger value="all">
            <Filter aria-hidden="true" className="mr-1 h-4 w-4" />
            All
          </TabsTrigger>
          {workoutFilters.map((workoutType) => (
            <TabsTrigger key={workoutType} value={workoutType}>
              {workoutLabel(workoutType)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all">{renderResultList("all")}</TabsContent>
        {workoutFilters.map((workoutType) => (
          <TabsContent key={workoutType} value={workoutType}>
            {renderResultList(workoutType)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
