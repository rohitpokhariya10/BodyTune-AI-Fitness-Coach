import { apiClient } from "@/shared/api/client";
import type { ProfileFormState } from "@/shared/types";

export type UserProfile = {
  id: number;
  name: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: ProfileFormState["fitness_goal"];
  experience_level: ProfileFormState["experience_level"];
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fats_goal_g: number | null;
  created_at: string;
  updated_at: string;
};

export type UserProfilePayload = {
  name: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fitness_goal: ProfileFormState["fitness_goal"];
  experience_level: ProfileFormState["experience_level"];
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fats_goal_g: number | null;
};

function removeUndefinedFields<T extends Record<string, unknown>>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as T;
}

export const profileService = {
  getMe() {
    return apiClient.request<UserProfile>("/api/v1/profiles/me");
  },

  updateMe(payload: UserProfilePayload) {
    return apiClient.request<UserProfile>("/api/v1/profiles/me", {
      body: JSON.stringify(removeUndefinedFields(payload)),
      method: "PUT",
    });
  },
};
