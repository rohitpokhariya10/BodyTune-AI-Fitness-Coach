export type FitnessGoal =
  | "fat_loss"
  | "muscle_gain"
  | "strength"
  | "endurance"
  | "general_fitness";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type BudgetMode = "low" | "medium" | "high";
export type DietType =
  | "vegetarian"
  | "non_vegetarian"
  | "vegan"
  | "eggetarian"
  | "mixed";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutLocation = "home" | "gym" | "mixed";
export type PlanDuration = 7 | 14 | 30;

export type AIPlanGenerateInput = {
  goal: FitnessGoal;
  age: number;
  gender?: Gender;
  height_cm: number;
  weight_kg: number;
  budget: BudgetMode;
  monthly_budget?: number | null;
  diet_type: DietType;
  meals_per_day: number;
  activity_level: ActivityLevel;
  experience_level: ExperienceLevel;
  workout_location: WorkoutLocation;
  equipment: string;
  days_per_week: number;
  workout_time_minutes: number;
  allergies_restrictions: string;
  medical_note?: string;
  duration_days: PlanDuration;
};

export type PlanSummary = {
  goal: FitnessGoal;
  bmr: number;
  tdee: number;
  calories_per_day: number;
  duration_days: number;
  budget: BudgetMode;
  calorie_note?: string;
};

export type MacroTargets = {
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

export type MealPlanItem = {
  meal: string;
  target_calories: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  foods: string[];
  note: string;
};

export type WorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  note: string;
};

export type WorkoutDay = {
  day: number;
  title: string;
  type: "training" | "recovery";
  duration_minutes: number;
  exercises: WorkoutExercise[];
};

export type AIPlanData = {
  summary: PlanSummary;
  macros: MacroTargets;
  hydration: {
    liters_per_day: number;
    base_liters?: number;
    workout_adjustment_liters?: number;
    activity_adjustment_liters?: number;
    goal_adjustment_liters?: number;
    note: string;
  };
  meals: MealPlanItem[];
  budget_foods: string[];
  vitamins_minerals: string[];
  workouts: WorkoutDay[];
  recovery_tips: string[];
  safety_notes: string[];
  personalization_reasons?: string[];
};

export type AIPlan = {
  id: number;
  user_id: number;
  title: string;
  goal: FitnessGoal;
  input_data: AIPlanGenerateInput;
  plan_data: AIPlanData;
  duration_days: number;
  created_at: string;
  updated_at: string;
};
