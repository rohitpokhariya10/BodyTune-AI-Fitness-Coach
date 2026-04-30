import type {
  ExerciseType,
  PoseAngleReasons,
  PoseAngles,
} from "@/features/workouts/services/pose/exerciseAngles";

export type WorkoutPhase = "up" | "down" | "unknown";

export type WorkoutRuleResult = {
  phase: WorkoutPhase;
  isGoodForm: boolean;
  feedback: string;
  feedbackTags: string[];
  formScore: number;
};

export type WorkoutRuleInput = {
  angles: PoseAngles;
  angleReasons: PoseAngleReasons;
  poseDetected: boolean;
};

export type WorkoutCountingStatus = {
  poseValid: boolean;
  countingEnabled: boolean;
  disabledReason: string;
  guidance: string;
};

export type BackendWorkoutType = Extract<ExerciseType, "squat" | "push_up">;

export type WorkoutResultCreatePayload = {
  user_id: number;
  workout_type: BackendWorkoutType;
  duration_seconds: number;
  total_reps: number;
  correct_reps: number;
  incorrect_reps: number;
  primary_feedback: string | null;
  feedback_tags: string[];
};

export type WorkoutResultRead = WorkoutResultCreatePayload & {
  id: number;
  created_at: string;
};

export type RecommendationCreatePayload = {
  user_id: number;
  workout_result_id: number;
};

export type RecommendationRead = RecommendationCreatePayload & {
  id: number;
  recommendation_type: "form" | "volume" | "consistency" | "progression";
  message: string;
  created_at: string;
};

export type BackendSaveStatus = "idle" | "saving" | "saved" | "failed" | "skipped";

export type SessionSummary = {
  exercise: ExerciseType;
  durationSeconds: number;
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  formScore: number;
  feedbackTags: string[];
  localNote: string | null;
  saveStatus: BackendSaveStatus;
  recommendationMessage: string | null;
  saveError: string | null;
};
