import { apiClient } from "@/shared/api/client";

import type {
  SubscriptionPlan,
  UserSubscription,
} from "@/features/subscription/types";

export const subscriptionService = {
  async getSubscriptionData() {
    const [plans, subscription] = await Promise.all([
      apiClient.request<SubscriptionPlan[]>("/api/v1/subscription/plans"),
      apiClient.request<UserSubscription>("/api/v1/subscription/me"),
    ]);

    return { plans, subscription };
  },

  mockPurchase(userId: number, planId: number) {
    return apiClient.request<UserSubscription>("/api/v1/subscription/mock-purchase", {
      body: JSON.stringify({
        plan_id: planId,
        user_id: userId,
      }),
      method: "POST",
    });
  },
};
