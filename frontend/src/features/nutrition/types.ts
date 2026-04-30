export type {
  CustomFoodCreate,
  DietLog,
  DietSummary,
  FoodItem,
  MealPhotoUploadResponse,
  MealType,
} from "@/shared/types";

export type CustomEstimateForm = {
  name: string;
  serving_unit: string;
  calories_per_serving: string;
  protein_g: string;
  carbs_g: string;
  fats_g: string;
};

export type CustomFoodEstimate = {
  name: string;
  serving_unit: string;
  calories_per_serving: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
};

export type DietLogDeleteResponse = {
  deleted_id: number;
  message: string;
};

export type ModelPrediction = {
  className: string;
  probability: number;
};

export type DetectedFoodSuggestion = {
  confidence: number;
  food: import("@/shared/types").FoodItem;
};
