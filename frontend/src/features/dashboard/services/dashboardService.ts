import { apiClient } from "@/shared/api/client";

import type {
  DashboardSummary,
  DashboardSubscriptionSummary,
  WorkoutSessionSummary,
} from "@/features/dashboard/types";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSession(value: unknown): WorkoutSessionSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    correct_reps: numberOr(value.correct_reps, 0),
    created_at: stringOr(value.created_at, new Date(0).toISOString()),
    duration_seconds: numberOr(value.duration_seconds, 0),
    feedback_tags: Array.isArray(value.feedback_tags)
      ? value.feedback_tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    form_score: numberOr(value.form_score, 0),
    id: numberOr(value.id, 0),
    incorrect_reps: numberOr(value.incorrect_reps, 0),
    primary_feedback:
      typeof value.primary_feedback === "string" ? value.primary_feedback : null,
    total_reps: numberOr(value.total_reps, 0),
    workout_type: stringOr(value.workout_type, "workout"),
  };
}

function isWorkoutSession(
  value: WorkoutSessionSummary | null,
): value is WorkoutSessionSummary {
  return value !== null;
}

function normalizeSubscription(value: unknown): DashboardSubscriptionSummary {
  if (!isRecord(value)) {
    return {
      expires_at: null,
      is_premium: false,
      plan_name: "Free",
      status: "free",
    };
  }

  const plan = isRecord(value.plan) ? value.plan : {};
  const status = stringOr(value.status, "free");
  const normalizedStatus =
    status === "active" || status === "inactive" || status === "expired"
      ? status
      : "free";

  return {
    expires_at: typeof value.expires_at === "string" ? value.expires_at : null,
    is_premium: value.unlocks_premium === true || value.is_premium === true,
    plan_name: stringOr(value.plan_name, stringOr(plan.name, "Free")),
    status: normalizedStatus,
  };
}

export function normalizeDashboardSummary(raw: unknown): DashboardSummary {
  const root = isRecord(raw) ? raw : {};
  const user = isRecord(root.user) ? root.user : {};
  const profile = isRecord(root.profile) ? root.profile : {};
  const nutrition = isRecord(root.nutrition) ? root.nutrition : {};
  const workouts = isRecord(root.workouts) ? root.workouts : {};
  const activity = isRecord(root.activity) ? root.activity : {};
  const insight = isRecord(root.insight) ? root.insight : {};
  const recentSessions = Array.isArray(workouts.recent_sessions)
    ? workouts.recent_sessions.map(normalizeSession).filter(isWorkoutSession)
    : [];

  return {
    activity: {
      current_streak: numberOr(activity.current_streak, 0),
      longest_streak: numberOr(activity.longest_streak, 0),
      today_activity_count: numberOr(activity.today_activity_count, 0),
      total_active_days: numberOr(activity.total_active_days, 0),
    },
    insight: {
      focus_area: stringOr(insight.focus_area, "Build consistency"),
      message: stringOr(
        insight.message,
        "Log a meal or complete a workout to generate personalized insights.",
      ),
      title: stringOr(insight.title, "Start your first session"),
    },
    nutrition: {
      calorie_goal: nullableNumber(nutrition.calorie_goal),
      calories_remaining: nullableNumber(nutrition.calories_remaining),
      carbs_goal_g: nullableNumber(nutrition.carbs_goal_g),
      fats_goal_g: nullableNumber(nutrition.fats_goal_g),
      goal_is_set:
        nutrition.goal_is_set === true ||
        nullableNumber(nutrition.calorie_goal) !== null,
      meals_logged_today: numberOr(nutrition.meals_logged_today, 0),
      protein_goal_g: nullableNumber(nutrition.protein_goal_g),
      total_calories: numberOr(nutrition.total_calories, 0),
      total_carbs_g: numberOr(nutrition.total_carbs_g, 0),
      total_fats_g: numberOr(nutrition.total_fats_g, 0),
      total_protein_g: numberOr(nutrition.total_protein_g, 0),
    },
    profile: {
      age: nullableNumber(profile.age),
      experience_level:
        profile.experience_level === "intermediate" ||
        profile.experience_level === "advanced"
          ? profile.experience_level
          : "beginner",
      fitness_goal:
        profile.fitness_goal === "strength" ||
        profile.fitness_goal === "weight_loss" ||
        profile.fitness_goal === "mobility"
          ? profile.fitness_goal
          : "general_fitness",
      height_cm: nullableNumber(profile.height_cm),
      calorie_goal: nullableNumber(profile.calorie_goal),
      protein_goal_g: nullableNumber(profile.protein_goal_g),
      carbs_goal_g: nullableNumber(profile.carbs_goal_g),
      fats_goal_g: nullableNumber(profile.fats_goal_g),
      weight_kg: nullableNumber(profile.weight_kg),
    },
    subscription: normalizeSubscription(root.subscription),
    user: {
      email: stringOr(user.email, ""),
      id: numberOr(user.id, 0),
      name: stringOr(user.name, "User"),
      role: user.role === "admin" ? "admin" : "user",
    },
    workouts: {
      average_form_score: numberOr(workouts.average_form_score, 0),
      best_score: numberOr(workouts.best_score, 0),
      latest_session: normalizeSession(workouts.latest_session),
      recent_sessions: recentSessions,
      total_reps: numberOr(workouts.total_reps, 0),
      total_sessions: numberOr(workouts.total_sessions, 0),
    },
  };
}

export const dashboardService = {
  async getSummary() {
    const raw = await apiClient.request<unknown>("/api/v1/dashboard/summary");
    return normalizeDashboardSummary(raw);
  },
};
