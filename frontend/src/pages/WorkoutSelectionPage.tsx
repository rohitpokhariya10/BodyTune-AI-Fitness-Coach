import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Dumbbell,
  Flame,
  History,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { ApiClientError } from "@/shared/api/client";
import { Badge } from "@/shared/ui/Badge";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { Progress } from "@/shared/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/Tabs";
import {
  workoutService,
  type ExerciseWorkoutSummary,
  type WorkoutSummary,
} from "@/features/workouts/services/workoutService";

const exercises = [
  {
    category: "ai",
    difficulty: "Beginner",
    exerciseKey: "squat",
    muscle: "Lower body",
    name: "Squat",
  },
  {
    category: "ai",
    difficulty: "Moderate",
    exerciseKey: "push_up",
    muscle: "Chest and triceps",
    name: "Push-up",
  },
  {
    category: "core",
    difficulty: "Beginner",
    exerciseKey: "crunch",
    muscle: "Core",
    name: "Crunch",
  },
  {
    category: "strength",
    difficulty: "Beginner",
    exerciseKey: "bicep_curl",
    muscle: "Biceps",
    name: "Bicep Curl",
  },
  {
    category: "core",
    difficulty: "Moderate",
    exerciseKey: "plank",
    muscle: "Core stability",
    name: "Plank",
  },
  {
    category: "strength",
    difficulty: "Moderate",
    exerciseKey: "lunges",
    muscle: "Legs and glutes",
    name: "Lunges",
  },
  {
    category: "cardio",
    difficulty: "Advanced",
    exerciseKey: "mountain_climbers",
    muscle: "Full body",
    name: "Mountain Climbers",
  },
  {
    category: "cardio",
    difficulty: "Beginner",
    exerciseKey: "jumping_jacks",
    muscle: "Full body",
    name: "Jumping Jacks",
  },
];

const tabs = [
  ["ai", "AI Coaching"],
  ["strength", "Strength"],
  ["core", "Core"],
  ["cardio", "Cardio"],
];

const liveSupportedExercises = new Set(["Squat", "Push-up", "Crunch", "Bicep Curl"]);

const metricCardClassName =
  "rounded-2xl border border-border bg-background/30 p-3.5";

function ExerciseCard({
  exercise,
  stats,
  isSelected,
  onSelect,
}: {
  exercise: (typeof exercises)[number];
  stats: ExerciseWorkoutSummary | undefined;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isLiveAvailable = liveSupportedExercises.has(exercise.name);
  const lastScore = stats?.last_score ?? null;
  const totalSessions = stats?.total_sessions ?? 0;
  const totalReps = stats?.total_reps ?? 0;

  return (
    <GlassCard
      aria-selected={isSelected}
      className={`bento-card flex h-full flex-col p-5 sm:p-6 ${
        isSelected ? "selected-card" : ""
      } ${!isLiveAvailable ? "border-border opacity-70" : ""}`}
      data-gsap="card"
      interactive={isLiveAvailable}
      onClick={onSelect}
      role="option"
      tabIndex={0}
      variant={isSelected ? "selected" : isLiveAvailable ? "interactive" : "disabled"}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant={exercise.category === "ai" ? "default" : "secondary"}>
            {exercise.muscle}
          </Badge>
          <h3 className="mt-4 font-display text-2xl font-bold text-foreground">
            {exercise.name}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {exercise.difficulty} difficulty
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
            isSelected
              ? "border-primary/28 bg-primary/[0.085] text-primary"
              : isLiveAvailable
                ? "border-primary/18 bg-primary/[0.055] text-primary"
                : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {isSelected ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          ) : isLiveAvailable ? (
            <Dumbbell aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Lock aria-hidden="true" className="h-5 w-5" />
          )}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className={metricCardClassName}>
          <p className="text-xs text-muted-foreground">Last score</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {lastScore === null ? "\u2014" : `${lastScore}%`}
          </p>
          <Progress className="mt-2 h-2" value={lastScore ?? 0} />
        </div>
        <div className={metricCardClassName}>
          <p className="text-xs text-muted-foreground">Total sessions</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">
            {totalSessions}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {totalSessions > 0 ? "Tracked workouts" : "No sessions yet"}
          </p>
        </div>
        <div className={`${metricCardClassName} sm:col-span-2`}>
          <p className="text-xs text-muted-foreground">Total reps</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground">{totalReps}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
        <PremiumButton
          className="flex-1"
          disabled={!isLiveAvailable}
          icon={isLiveAvailable ? ArrowRight : Lock}
          to={isLiveAvailable ? "/workouts/live" : undefined}
          variant={isSelected ? "selected" : "primary"}
        >
          {isLiveAvailable ? `Start ${exercise.name}` : "Live unavailable"}
        </PremiumButton>
        <PremiumButton className="flex-1" icon={History} to="/results" variant="secondary">
          View History
        </PremiumButton>
      </div>
    </GlassCard>
  );
}

export default function WorkoutSelectionPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const [selectedExerciseName, setSelectedExerciseName] = useState("Squat");
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await workoutService.getWorkoutSummary());
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Unable to load workout summary. Start the backend and retry.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const exerciseStatsByKey = useMemo(
    () =>
      new Map(
        (summary?.exercise_stats ?? []).map((exerciseStats) => [
          exerciseStats.exercise_key,
          exerciseStats,
        ]),
      ),
    [summary?.exercise_stats],
  );

  const summaryStats = [
    ["Sessions", isLoading ? "..." : String(summary?.total_sessions ?? 0), Timer],
    ["Best score", isLoading ? "..." : `${summary?.best_score ?? 0}%`, ShieldCheck],
    ["Active streak", isLoading ? "..." : `${summary?.active_streak ?? 0}d`, Flame],
  ] as const;

  return (
    <div className="app-page" ref={scopeRef}>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <GlassCard
          className="border-primary/14 bg-[linear-gradient(135deg,rgb(var(--theme-primary-rgb)/0.04),transparent_42%),var(--app-card)] p-6 sm:p-7"
          data-gsap="slide-left"
        >
          <Badge>Workout tracker</Badge>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Choose your next coaching session
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            AI-supported exercises open the live camera coach. Other training
            cards keep your workout plan organized and ready for history review.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <PremiumButton icon={Activity} to="/workouts/live">
              Open Live Coach
            </PremiumButton>
            <PremiumButton icon={BarChart3} to="/results" variant="secondary">
              Review Results
            </PremiumButton>
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {summaryStats.map(([label, value, Icon]) => (
            <GlassCard className="bento-card p-5" data-gsap="card" key={label as string}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{label as string}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-foreground">
                    {value as string}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/[0.055] text-primary">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {isLoading ? (
        <GlassCard className="flex min-h-32 items-center justify-center p-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Loading workout summary
          </div>
        </GlassCard>
      ) : error ? (
        <GlassCard className="p-6 text-center">
          <p className="text-lg font-semibold text-foreground">Workout summary unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <PremiumButton className="mt-5" icon={ArrowRight} onClick={() => void loadSummary()}>
            Retry
          </PremiumButton>
        </GlassCard>
      ) : summary?.total_sessions === 0 ? (
        <GlassCard className="bento-card p-5" data-gsap="fade-up">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Dumbbell aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">No sessions yet</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start a live coaching session to populate real workout stats here.
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}

      <Tabs defaultValue="ai" data-gsap="fade-up">
        <TabsList className="no-scrollbar max-w-full overflow-x-auto rounded-2xl">
          {tabs.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(([value]) => (
          <TabsContent key={value} value={value}>
            <section className="grid gap-4 xl:grid-cols-2">
              {exercises
                .filter((exercise) => exercise.category === value)
                .map((exercise) => (
                  <ExerciseCard
                    exercise={exercise}
                    stats={exerciseStatsByKey.get(exercise.exerciseKey)}
                    isSelected={selectedExerciseName === exercise.name}
                    key={exercise.name}
                    onSelect={() => setSelectedExerciseName(exercise.name)}
                  />
                ))}
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
