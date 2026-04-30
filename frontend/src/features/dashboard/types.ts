import type { AuthRole } from "@/features/auth/types";
export type DashboardUser = {
  id: number;
  name: string;
  email: string;
  role: AuthRole;
};

export type DashboardProfile = {
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: "general_fitness" | "strength" | "weight_loss" | "mobility";
  experience_level: "beginner" | "intermediate" | "advanced";
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fats_goal_g: number | null;
};

export type NutritionDashboardSummary = {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fats_goal_g: number | null;
  calories_remaining: number | null;
  meals_logged_today: number;
  goal_is_set: boolean;
};

export type WorkoutSessionSummary = {
  id: number;
  workout_type: string;
  duration_seconds: number;
  total_reps: number;
  correct_reps: number;
  incorrect_reps: number;
  form_score: number;
  primary_feedback: string | null;
  feedback_tags: string[];
  created_at: string;
};

export type WorkoutDashboardSummary = {
  total_sessions: number;
  total_reps: number;
  average_form_score: number;
  best_score: number;
  latest_session: WorkoutSessionSummary | null;
  recent_sessions: WorkoutSessionSummary[];
};

export type ActivityDashboardSummary = {
  current_streak: number;
  longest_streak: number;
  today_activity_count: number;
  total_active_days: number;
};

export type DashboardInsight = {
  title: string;
  message: string;
  focus_area: string;
};

export type DashboardSubscriptionSummary = {
  status: "free" | "active" | "inactive" | "expired";
  plan_name: string;
  is_premium: boolean;
  expires_at: string | null;
};

export type DashboardSummary = {
  user: DashboardUser;
  profile: DashboardProfile;
  nutrition: NutritionDashboardSummary;
  workouts: WorkoutDashboardSummary;
  activity: ActivityDashboardSummary;
  subscription: DashboardSubscriptionSummary;
  insight: DashboardInsight;
};
