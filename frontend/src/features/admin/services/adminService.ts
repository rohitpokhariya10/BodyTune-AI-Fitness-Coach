import { apiClient } from "@/shared/api/client";

import type {
  AdminUser,
  AdminSummary,
  ExerciseVideo,
  ExerciseVideoPayload,
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/features/admin/types";

export type UploadedAdminAsset = {
  url: string;
  file_id: string;
  name: string;
  size: number;
  file_type: string;
};

function adminHeaders(): HeadersInit {
  const adminKey = String(import.meta.env.VITE_ADMIN_KEY ?? "").trim();
  return adminKey ? { "X-ADMIN-KEY": adminKey } : {};
}

export const adminService = {
  async getAdminData() {
    const [summary, users, videos, plans] = await Promise.all([
      apiClient.request<AdminSummary>("/api/v1/admin/summary"),
      apiClient.request<AdminUser[]>("/api/v1/admin/users"),
      apiClient.request<ExerciseVideo[]>("/api/v1/admin/videos", {
        headers: adminHeaders(),
      }),
      apiClient.request<SubscriptionPlan[]>("/api/v1/admin/plans", {
        headers: adminHeaders(),
      }),
    ]);

    return { plans, summary, users, videos };
  },

  getAdminSummary() {
    return apiClient.request<AdminSummary>("/api/v1/admin/summary");
  },

  getUsers() {
    return apiClient.request<AdminUser[]>("/api/v1/admin/users");
  },

  createPlan(payload: SubscriptionPlanPayload) {
    return apiClient.request<SubscriptionPlan>("/api/v1/admin/plans", {
      body: JSON.stringify(payload),
      headers: adminHeaders(),
      method: "POST",
    });
  },

  createVideo(payload: ExerciseVideoPayload) {
    return apiClient.request<ExerciseVideo>("/api/v1/admin/videos", {
      body: JSON.stringify(payload),
      headers: adminHeaders(),
      method: "POST",
    });
  },

  deleteVideo(videoId: number) {
    return apiClient.request<void>(`/api/v1/admin/videos/${videoId}`, {
      headers: adminHeaders(),
      method: "DELETE",
    });
  },

  updatePlan(planId: number, payload: Partial<SubscriptionPlanPayload>) {
    return apiClient.request<SubscriptionPlan>(`/api/v1/admin/plans/${planId}`, {
      body: JSON.stringify(payload),
      headers: adminHeaders(),
      method: "PUT",
    });
  },

  updateVideo(videoId: number, payload: Partial<ExerciseVideoPayload>) {
    return apiClient.request<ExerciseVideo>(`/api/v1/admin/videos/${videoId}`, {
      body: JSON.stringify(payload),
      headers: adminHeaders(),
      method: "PUT",
    });
  },

  async uploadAsset(assetType: "video" | "thumbnail", file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.request<UploadedAdminAsset>(
      `/api/v1/admin/uploads/${assetType}`,
      {
        body: formData,
        headers: adminHeaders(),
        method: "POST",
      },
    );

    return response;
  },
};
