import { apiClient } from "@/shared/api/client";
import type { AIPlan, AIPlanGenerateInput } from "@/features/ai-plan/types";

export const aiPlanService = {
  generate(payload: AIPlanGenerateInput) {
    return apiClient.request<AIPlan>("/api/v1/ai-plans/generate", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  list() {
    return apiClient.request<AIPlan[]>("/api/v1/ai-plans");
  },

  get(planId: number) {
    return apiClient.request<AIPlan>(`/api/v1/ai-plans/${planId}`);
  },

  delete(planId: number) {
    return apiClient.request<void>(`/api/v1/ai-plans/${planId}`, {
      method: "DELETE",
    });
  },
};
