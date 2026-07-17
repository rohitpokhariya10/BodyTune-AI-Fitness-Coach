import { z } from 'zod';

import { FEEDBACK_TAGS_BY_WORKOUT, WORKOUT_FEEDBACK_TAGS, WORKOUT_TYPES } from './workout.types';

const MAX_DURATION_SECONDS = 4 * 60 * 60;
const MAX_REPS = 5_000;
const MAX_FEEDBACK_TAGS = 12;
const mongoObjectIdPattern = /^[a-f\d]{24}$/i;
const safeVersionPattern = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;

export const authenticatedWorkoutUserIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9:_-]+$/, 'Authenticated user identifier is invalid');

const poseEngineSchema = z
  .object({
    model_name: z.literal('pose_landmarker_lite_float16'),
    model_version: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(safeVersionPattern, 'model_version contains unsupported characters')
      .refine((version) => version.toLowerCase() !== 'latest', {
        message: 'model_version must be immutable and must not be latest',
      }),
    name: z.literal('mediapipe_pose_landmarker'),
    package_version: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(safeVersionPattern, 'package_version contains unsupported characters'),
    workout_rules_version: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(safeVersionPattern, 'workout_rules_version contains unsupported characters'),
  })
  .strict();

export const completeWorkoutBodySchema = z
  .object({
    client_form_score: z.number().finite().min(0).max(100).optional(),
    client_session_id: z.string().uuid(),
    correct_reps: z.number().int().min(0).max(MAX_REPS),
    duration_seconds: z.number().int().min(1).max(MAX_DURATION_SECONDS),
    feedback_tags: z.array(z.enum(WORKOUT_FEEDBACK_TAGS)).max(MAX_FEEDBACK_TAGS).default([]),
    incorrect_reps: z.number().int().min(0).max(MAX_REPS),
    pose_engine: poseEngineSchema,
    primary_feedback: z.string().trim().min(1).max(255).nullable().default(null),
    total_reps: z.number().int().min(0).max(MAX_REPS),
    workout_type: z.enum(WORKOUT_TYPES),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.correct_reps + value.incorrect_reps !== value.total_reps) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correct_reps + incorrect_reps must equal total_reps',
        path: ['total_reps'],
      });
    }

    if (new Set(value.feedback_tags).size !== value.feedback_tags.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'feedback_tags must not contain duplicates',
        path: ['feedback_tags'],
      });
    }

    const allowedTags = new Set<string>(FEEDBACK_TAGS_BY_WORKOUT[value.workout_type]);
    value.feedback_tags.forEach((tag, index) => {
      if (!allowedTags.has(tag)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${tag} is not valid for ${value.workout_type}`,
          path: ['feedback_tags', index],
        });
      }
    });
  })
  .transform((value) => ({
    ...(value.client_form_score === undefined ? {} : { clientFormScore: value.client_form_score }),
    clientSessionId: value.client_session_id,
    correctReps: value.correct_reps,
    durationSeconds: value.duration_seconds,
    feedbackTags: value.feedback_tags,
    incorrectReps: value.incorrect_reps,
    poseEngine: {
      modelName: value.pose_engine.model_name,
      modelVersion: value.pose_engine.model_version,
      name: value.pose_engine.name,
      packageVersion: value.pose_engine.package_version,
      workoutRulesVersion: value.pose_engine.workout_rules_version,
    },
    primaryFeedback: value.primary_feedback,
    totalReps: value.total_reps,
    workoutType: value.workout_type,
  }));

export const workoutSessionParamsSchema = z
  .object({
    sessionId: z.string().regex(mongoObjectIdPattern, 'sessionId must be a MongoDB ObjectId'),
  })
  .strict();

export const workoutListQuerySchema = z
  .object({
    cursor: z.string().regex(mongoObjectIdPattern, 'cursor must be a MongoDB ObjectId').optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    workout_type: z.enum(WORKOUT_TYPES).optional(),
  })
  .strict()
  .transform((value) => ({
    ...(value.cursor === undefined ? {} : { cursor: value.cursor }),
    limit: value.limit,
    ...(value.workout_type === undefined ? {} : { workoutType: value.workout_type }),
  }));

export type CompleteWorkoutRequest = z.infer<typeof completeWorkoutBodySchema>;
export type WorkoutListRequest = z.infer<typeof workoutListQuerySchema>;
export type WorkoutSessionParams = z.infer<typeof workoutSessionParamsSchema>;
