import mongoose, { type HydratedDocument, type Model, Schema } from 'mongoose';

import {
  FEEDBACK_TAGS_BY_WORKOUT,
  WORKOUT_FEEDBACK_TAGS,
  WORKOUT_TYPES,
  type PoseEngineMetadata,
  type WorkoutFeedbackTag,
  type WorkoutRecommendationSnapshot,
  type WorkoutType,
} from './workout.types';

export interface WorkoutSessionPersistence {
  canonicalFormScore: number;
  clientFormScore?: number;
  clientSessionId: string;
  completedAt: Date;
  correctReps: number;
  createdAt: Date;
  deletedAt: Date | null;
  durationSeconds: number;
  feedbackTags: WorkoutFeedbackTag[];
  incorrectReps: number;
  poseEngine: PoseEngineMetadata;
  primaryFeedback: string | null;
  recommendation: WorkoutRecommendationSnapshot;
  status: 'completed';
  totalReps: number;
  updatedAt: Date;
  userId: string;
  workoutType: WorkoutType;
}

export type WorkoutSessionDocument = HydratedDocument<WorkoutSessionPersistence>;

const poseEngineSchema = new Schema<PoseEngineMetadata>(
  {
    modelName: {
      enum: ['pose_landmarker_lite_float16'],
      required: true,
      type: String,
    },
    modelVersion: { maxlength: 64, required: true, trim: true, type: String },
    name: {
      enum: ['mediapipe_pose_landmarker'],
      required: true,
      type: String,
    },
    packageVersion: { maxlength: 64, required: true, trim: true, type: String },
    workoutRulesVersion: { maxlength: 64, required: true, trim: true, type: String },
  },
  { _id: false, strict: 'throw' },
);

const recommendationSchema = new Schema<WorkoutRecommendationSnapshot>(
  {
    message: { maxlength: 500, required: true, trim: true, type: String },
    rulesVersion: { maxlength: 64, required: true, trim: true, type: String },
    type: {
      enum: ['form', 'volume', 'consistency', 'progression'],
      required: true,
      type: String,
    },
  },
  { _id: false, strict: 'throw' },
);

const workoutSessionSchema = new Schema<WorkoutSessionPersistence>(
  {
    canonicalFormScore: { max: 100, min: 0, required: true, type: Number },
    clientFormScore: { max: 100, min: 0, required: false, type: Number },
    clientSessionId: {
      lowercase: true,
      match: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      maxlength: 36,
      required: true,
      trim: true,
      type: String,
    },
    completedAt: { immutable: true, index: true, required: true, type: Date },
    correctReps: { max: 5_000, min: 0, required: true, type: Number },
    deletedAt: { default: null, type: Date },
    durationSeconds: { max: 14_400, min: 1, required: true, type: Number },
    feedbackTags: {
      default: [],
      enum: WORKOUT_FEEDBACK_TAGS,
      type: [String],
    },
    incorrectReps: { max: 5_000, min: 0, required: true, type: Number },
    poseEngine: { required: true, type: poseEngineSchema },
    primaryFeedback: { default: null, maxlength: 255, trim: true, type: String },
    recommendation: { required: true, type: recommendationSchema },
    status: { enum: ['completed'], immutable: true, required: true, type: String },
    totalReps: { max: 5_000, min: 0, required: true, type: Number },
    userId: { index: true, maxlength: 128, required: true, trim: true, type: String },
    workoutType: { enum: WORKOUT_TYPES, index: true, required: true, type: String },
  },
  {
    collection: 'workout_sessions',
    strict: 'throw',
    timestamps: true,
    versionKey: false,
  },
);

workoutSessionSchema.index(
  { userId: 1, clientSessionId: 1 },
  { name: 'workout_session_owner_idempotency', unique: true },
);
workoutSessionSchema.index(
  { userId: 1, completedAt: -1, _id: -1 },
  { name: 'workout_session_owner_history' },
);
workoutSessionSchema.index(
  { userId: 1, workoutType: 1, completedAt: -1 },
  { name: 'workout_session_owner_exercise_history' },
);

workoutSessionSchema.pre('validate', function validateWorkoutSession() {
  if (this.correctReps + this.incorrectReps !== this.totalReps) {
    this.invalidate('totalReps', 'correctReps + incorrectReps must equal totalReps');
  }

  const allowedTags = new Set<string>(FEEDBACK_TAGS_BY_WORKOUT[this.workoutType]);
  if (this.feedbackTags.some((tag) => !allowedTags.has(tag))) {
    this.invalidate('feedbackTags', `feedbackTags are invalid for ${this.workoutType}`);
  }

  if (new Set(this.feedbackTags).size !== this.feedbackTags.length) {
    this.invalidate('feedbackTags', 'feedbackTags must not contain duplicates');
  }
});

export const WorkoutSessionModel: Model<WorkoutSessionPersistence> =
  (mongoose.models.WorkoutSession as Model<WorkoutSessionPersistence> | undefined) ??
  mongoose.model<WorkoutSessionPersistence>('WorkoutSession', workoutSessionSchema);
