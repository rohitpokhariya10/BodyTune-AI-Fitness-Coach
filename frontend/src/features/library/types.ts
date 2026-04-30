export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseVideo = {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: ExerciseDifficulty;
  duration_minutes: number;
  target_muscles: string[];
  equipment: string;
  video_url: string;
  thumbnail_url: string;
  imagekit_video_file_id: string;
  imagekit_thumbnail_file_id: string;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserExerciseVideo = ExerciseVideo & {
  locked: boolean;
};

export type VideoAccessResponse = {
  locked: boolean;
  message: string;
  video: UserExerciseVideo;
};

export type SubscriptionPlan = {
  id: number | null;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  created_at: string | null;
};

export type UserSubscription = {
  id: number | null;
  user_id: number;
  plan_id: number | null;
  status: "active" | "inactive" | "expired";
  started_at: string | null;
  expires_at: string | null;
  plan: SubscriptionPlan;
  unlocks_premium: boolean;
};

export type ExerciseVideoPayload = Omit<
  ExerciseVideo,
  "id" | "created_at" | "updated_at"
>;

export type SubscriptionPlanPayload = Omit<
  SubscriptionPlan,
  "id" | "created_at"
>;
