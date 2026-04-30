export type ActivityType =
  | "login"
  | "workout"
  | "diet_log"
  | "video_watch"
  | "subscription"
  | "general";

export type ActivitySummary = {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  today_activity_count: number;
  weekly_activity_count: number;
  monthly_activity_count: number;
};

export type ActivityDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  login_count?: number;
  workout_count?: number;
  diet_log_count?: number;
  video_watch_count?: number;
  subscription_action_count?: number;
};

export type ActivityHeatmapResponse = {
  days: ActivityDay[];
};

export type ActivityRecordResponse = {
  activity_type: ActivityType;
  activity_count: number;
  message: string;
};
