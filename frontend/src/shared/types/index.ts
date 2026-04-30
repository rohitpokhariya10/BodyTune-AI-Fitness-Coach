import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type DashboardStat = {
  label: string;
  value: string;
  helper: string;
  accent: "aqua" | "volt" | "ember";
  icon: LucideIcon;
};

export type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type WorkoutOption = {
  type: "squat" | "push_up";
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  focusAreas: string[];
  accent: "aqua" | "volt" | "ember";
};

export type RecentWorkout = {
  id: number;
  workout: string;
  date: string;
  reps: number;
  formScore: string;
  feedback: string;
};

export type ResultSummary = {
  workout: string;
  duration: string;
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  feedbackTags: string[];
  recommendation: string;
};

export type ProgressPoint = {
  name: string;
  reps: number;
  form: number;
};

export type ProfileFormState = {
  name: string;
  age: string;
  height_cm: string;
  weight_kg: string;
  fitness_goal: "general_fitness" | "strength" | "weight_loss" | "mobility";
  experience_level: "beginner" | "intermediate" | "advanced";
  calorie_goal: string;
  protein_goal_g: string;
  carbs_goal_g: string;
  fats_goal_g: string;
};

export type BackendHealthStatus = {
  status: string;
  service: string;
  version: string;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodItem = {
  id: number;
  name: string;
  aliases: string[];
  serving_unit: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  is_custom: boolean;
  created_at: string;
};

export type CustomFoodCreate = {
  name: string;
  aliases?: string[];
  serving_unit: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

export type MealPhotoUploadResponse = {
  photo_id: number;
  image_path: string;
  image_url: string;
  analysis_status: "uploaded" | "needs_confirmation" | "confirmed";
  suggested_foods: FoodItem[];
  message: string;
};

export type DietLog = {
  id: number;
  user_id: number;
  food_item_id: number;
  quantity: number;
  meal_type: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  photo_id: number | null;
  logged_at: string;
};

export type DietMealGroups = Record<MealType, DietLog[]>;

export type DietSummary = {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  meal_groups: DietMealGroups;
};
