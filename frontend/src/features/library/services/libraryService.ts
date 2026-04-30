import { apiClient } from "@/shared/api/client";

import type {
  UserExerciseVideo,
  UserSubscription,
  VideoAccessResponse,
} from "@/features/library/types";

export const libraryService = {
  async getLibrary() {
    const [videos, subscription] = await Promise.all([
      apiClient.request<UserExerciseVideo[]>("/api/v1/videos"),
      apiClient.request<UserSubscription>("/api/v1/subscription/me"),
    ]);

    return { subscription, videos };
  },

  getVideo(videoId: string) {
    return apiClient.request<VideoAccessResponse>(`/api/v1/videos/${videoId}`);
  },
};
