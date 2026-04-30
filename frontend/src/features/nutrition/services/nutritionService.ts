import { apiClient } from "@/shared/api/client";

import type {
  CustomFoodCreate,
  DietLog,
  DietLogDeleteResponse,
  DietSummary,
  FoodItem,
  MealPhotoUploadResponse,
  MealType,
} from "@/features/nutrition/types";

export const nutritionService = {
  async getDietData(userId: number) {
    const [foods, logs, summary] = await Promise.all([
      apiClient.request<FoodItem[]>("/api/v1/foods"),
      apiClient.request<DietLog[]>(`/api/v1/diet/logs/user/${userId}`),
      apiClient.request<DietSummary>(`/api/v1/diet/summary/user/${userId}`),
    ]);

    return { foods, logs, summary };
  },

  addCustomFoodLog(userId: number, payload: {
    custom_food: CustomFoodCreate;
    meal_type: MealType;
    photo_id: number | null;
    quantity: number;
  }) {
    return apiClient.request<DietLog>("/api/v1/diet/logs", {
      body: JSON.stringify({
        ...payload,
        user_id: userId,
      }),
      method: "POST",
    });
  },

  addFoodLog(userId: number, payload: {
    food_item_id: number;
    meal_type: MealType;
    photo_id: number | null;
    quantity: number;
  }) {
    return apiClient.request<DietLog>("/api/v1/diet/logs", {
      body: JSON.stringify({
        ...payload,
        user_id: userId,
      }),
      method: "POST",
    });
  },

  deleteLog(logId: number, userId: number) {
    return apiClient.request<DietLogDeleteResponse>(
      `/api/v1/diet/logs/${logId}?user_id=${userId}`,
      {
        method: "DELETE",
      },
    );
  },

  searchFoods(query: string) {
    return apiClient.request<FoodItem[]>(
      `/api/v1/foods/search?q=${encodeURIComponent(query)}`,
    );
  },

  uploadPhoto(userId: number, mealType: MealType, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", String(userId));
    formData.append("meal_type", mealType);

    return apiClient.request<MealPhotoUploadResponse>(
      "/api/v1/diet/photos/upload",
      {
        body: formData,
        method: "POST",
      },
    );
  },
};
