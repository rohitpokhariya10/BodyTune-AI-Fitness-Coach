import { apiClient } from "@/shared/api/client";

import type {
  ActivityHeatmapResponse,
  ActivityDay,
  ActivityRecordResponse,
  ActivitySummary,
  ActivityType,
} from "@/features/activity/types";

type RawActivityDay = Partial<ActivityDay> & {
  date?: unknown;
  count?: unknown;
  level?: unknown;
  login_count?: unknown;
  workout_count?: unknown;
  diet_log_count?: unknown;
  video_watch_count?: unknown;
};

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeLevel(value: unknown, count: number): ActivityDay["level"] {
  if (value !== undefined && value !== null) {
    return Math.max(0, Math.min(4, Math.trunc(toNumber(value)))) as ActivityDay["level"];
  }

  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

function normalizeHeatmapResponse(raw: unknown): ActivityHeatmapResponse {
  const rawDays = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { days?: unknown }).days)
      ? (raw as { days: unknown[] }).days
      : [];

  return {
    days: rawDays
      .filter(
        (day): day is RawActivityDay =>
          Boolean(day) &&
          typeof day === "object" &&
          typeof (day as RawActivityDay).date === "string",
      )
      .map((day) => {
        const count = toNumber(day.count);

        return {
          count,
          date: day.date as string,
          diet_log_count: toNumber(day.diet_log_count),
          level: normalizeLevel(day.level, count),
          login_count: toNumber(day.login_count),
          video_watch_count: toNumber(day.video_watch_count),
          workout_count: toNumber(day.workout_count),
        };
      }),
  };
}

export const activityService = {
  getActivitySummary() {
    return apiClient.request<ActivitySummary>("/api/v1/activity/summary");
  },

  async getActivityHeatmap(days = 365) {
    const response = await apiClient.request<unknown>(
      `/api/v1/activity/heatmap?days=${days}`,
    );
    return normalizeHeatmapResponse(response);
  },

  recordActivity(activityType: ActivityType = "general") {
    return apiClient.request<ActivityRecordResponse>("/api/v1/activity/record", {
      body: JSON.stringify({ activity_type: activityType }),
      method: "POST",
    });
  },

  recordVideoWatch(videoId?: number) {
    return apiClient.request<ActivityRecordResponse>(
      "/api/v1/activity/video-watch",
      {
        body: JSON.stringify({ video_id: videoId ?? null }),
        method: "POST",
      },
    );
  },
};
