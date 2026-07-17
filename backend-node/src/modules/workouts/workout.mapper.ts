import type {
  WorkoutSessionRecord,
  WorkoutSessionResponse,
  WorkoutSummary,
  WorkoutSummaryResponse,
} from './workout.types';

export const mapWorkoutSessionResponse = (
  session: WorkoutSessionRecord,
): WorkoutSessionResponse => ({
  canonical_form_score: session.canonicalFormScore,
  ...(session.clientFormScore === undefined ? {} : { client_form_score: session.clientFormScore }),
  client_session_id: session.clientSessionId,
  completed_at: session.completedAt.toISOString(),
  correct_reps: session.correctReps,
  created_at: session.createdAt.toISOString(),
  duration_seconds: session.durationSeconds,
  feedback_tags: [...session.feedbackTags],
  id: session.id,
  incorrect_reps: session.incorrectReps,
  pose_engine: {
    model_name: session.poseEngine.modelName,
    model_version: session.poseEngine.modelVersion,
    name: session.poseEngine.name,
    package_version: session.poseEngine.packageVersion,
    workout_rules_version: session.poseEngine.workoutRulesVersion,
  },
  primary_feedback: session.primaryFeedback,
  recommendation: {
    message: session.recommendation.message,
    rules_version: session.recommendation.rulesVersion,
    type: session.recommendation.type,
  },
  status: session.status,
  total_reps: session.totalReps,
  workout_type: session.workoutType,
});

export const mapWorkoutSummaryResponse = (summary: WorkoutSummary): WorkoutSummaryResponse => ({
  active_streak: summary.activeStreak,
  average_form_score: summary.averageFormScore,
  best_score: summary.bestScore,
  exercise_stats: summary.exerciseStats.map((exercise) => ({
    average_score: exercise.averageScore,
    best_score: exercise.bestScore,
    last_score: exercise.lastScore,
    last_session_at: exercise.lastSessionAt?.toISOString() ?? null,
    total_reps: exercise.totalReps,
    total_sessions: exercise.totalSessions,
    workout_type: exercise.workoutType,
  })),
  recent_sessions: summary.recentSessions.map(mapWorkoutSessionResponse),
  total_reps: summary.totalReps,
  total_sessions: summary.totalSessions,
});
