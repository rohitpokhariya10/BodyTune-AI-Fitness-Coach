import { apiClient } from "@/shared/api/client";

import type { WorkoutResultRead } from "@/features/workouts/types";

export const resultsService = {
  getMyResults() {
    return apiClient.request<WorkoutResultRead[]>("/api/v1/results/me");
  },
};
