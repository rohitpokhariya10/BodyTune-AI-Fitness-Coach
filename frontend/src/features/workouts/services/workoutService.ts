import { apiClient } from "@/shared/api/client";

export type ExerciseWorkoutSummary = {
  exercise_key: string;
  exercise_name: string;
  total_sessions: number;
  total_reps: number;
  last_score: number | null;
  best_score: number | null;
  average_score: number | null;
  last_session_at: string | null;
};

export type WorkoutSummarySession = {
  id: number;
  user_id: number;
  workout_type: string;
  duration_seconds: number;
  total_reps: number;
  correct_reps: number;
  incorrect_reps: number;
  primary_feedback: string | null;
  feedback_tags: string[];
  created_at: string;
};

export type WorkoutSummary = {
  total_sessions: number;
  total_reps: number;
  best_score: number;
  average_form_score: number;
  active_streak: number;
  exercise_stats: ExerciseWorkoutSummary[];
  recent_sessions: WorkoutSummarySession[];
};

export const workoutService = {
  getWorkoutSummary() {
    return apiClient.request<WorkoutSummary>("/api/v1/workouts/summary");
  },
};
