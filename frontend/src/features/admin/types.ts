export type {
  ExerciseDifficulty,
  ExerciseVideo,
  ExerciseVideoPayload,
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/features/library/types";

export type AdminSummary = {
  total_users: number;
  verified_users: number;
  admin_users: number;
  total_videos: number;
  active_videos: number;
  premium_videos: number;
  total_plans: number;
  total_subscriptions: number;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  is_verified: boolean;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: string | null;
  experience_level: string | null;
  created_at: string;
  updated_at: string;
};
