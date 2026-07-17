export const WORKOUT_TYPES = ['squat', 'push_up', 'crunch', 'bicep_curl'] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const FEEDBACK_TAGS_BY_WORKOUT = {
  bicep_curl: ['arm_not_visible', 'incomplete_curl', 'incomplete_extension', 'unstable_upper_arm'],
  crunch: ['incomplete_crunch', 'unstable_movement'],
  push_up: ['body_alignment', 'incomplete_depth', 'incomplete_extension'],
  squat: ['back_alignment', 'shallow_depth', 'unstable_movement'],
} as const satisfies Record<WorkoutType, readonly string[]>;

export const WORKOUT_FEEDBACK_TAGS = [
  'arm_not_visible',
  'back_alignment',
  'body_alignment',
  'incomplete_crunch',
  'incomplete_curl',
  'incomplete_depth',
  'incomplete_extension',
  'shallow_depth',
  'unstable_movement',
  'unstable_upper_arm',
] as const;

export type WorkoutFeedbackTag = (typeof WORKOUT_FEEDBACK_TAGS)[number];

export type WorkoutRecommendationType = 'form' | 'volume' | 'consistency' | 'progression';

export interface PoseEngineMetadata {
  modelName: 'pose_landmarker_lite_float16';
  modelVersion: string;
  name: 'mediapipe_pose_landmarker';
  packageVersion: string;
  workoutRulesVersion: string;
}

export interface CompleteWorkoutInput {
  clientFormScore?: number;
  clientSessionId: string;
  correctReps: number;
  durationSeconds: number;
  feedbackTags: WorkoutFeedbackTag[];
  incorrectReps: number;
  poseEngine: PoseEngineMetadata;
  primaryFeedback: string | null;
  totalReps: number;
  workoutType: WorkoutType;
}

export interface WorkoutRecommendationSnapshot {
  message: string;
  rulesVersion: string;
  type: WorkoutRecommendationType;
}

export interface NewCompletedWorkoutSession extends CompleteWorkoutInput {
  canonicalFormScore: number;
  completedAt: Date;
  recommendation: WorkoutRecommendationSnapshot;
  status: 'completed';
  userId: string;
}

export interface WorkoutSessionRecord extends NewCompletedWorkoutSession {
  createdAt: Date;
  deletedAt: Date | null;
  id: string;
  updatedAt: Date;
}

export interface WorkoutListQuery {
  cursor?: string;
  limit: number;
  workoutType?: WorkoutType;
}

export interface WorkoutSessionPage {
  items: WorkoutSessionRecord[];
  nextCursor: string | null;
}

export interface WorkoutExerciseSummary {
  averageScore: number | null;
  bestScore: number | null;
  lastScore: number | null;
  lastSessionAt: Date | null;
  totalReps: number;
  totalSessions: number;
  workoutType: WorkoutType;
}

export interface WorkoutSummarySnapshot {
  activeDates: string[];
  averageFormScore: number;
  bestScore: number;
  exerciseStats: WorkoutExerciseSummary[];
  recentSessions: WorkoutSessionRecord[];
  totalReps: number;
  totalSessions: number;
}

export interface WorkoutSummary extends Omit<WorkoutSummarySnapshot, 'activeDates'> {
  activeStreak: number;
}

export interface CompleteWorkoutResult {
  created: boolean;
  session: WorkoutSessionRecord;
}

export interface WorkoutSessionResponse {
  canonical_form_score: number;
  client_form_score?: number;
  client_session_id: string;
  completed_at: string;
  correct_reps: number;
  created_at: string;
  duration_seconds: number;
  feedback_tags: WorkoutFeedbackTag[];
  id: string;
  incorrect_reps: number;
  pose_engine: {
    model_name: PoseEngineMetadata['modelName'];
    model_version: string;
    name: PoseEngineMetadata['name'];
    package_version: string;
    workout_rules_version: string;
  };
  primary_feedback: string | null;
  recommendation: {
    message: string;
    rules_version: string;
    type: WorkoutRecommendationType;
  };
  status: 'completed';
  total_reps: number;
  workout_type: WorkoutType;
}

export interface WorkoutSummaryResponse {
  active_streak: number;
  average_form_score: number;
  best_score: number;
  exercise_stats: {
    average_score: number | null;
    best_score: number | null;
    last_score: number | null;
    last_session_at: string | null;
    total_reps: number;
    total_sessions: number;
    workout_type: WorkoutType;
  }[];
  recent_sessions: WorkoutSessionResponse[];
  total_reps: number;
  total_sessions: number;
}
