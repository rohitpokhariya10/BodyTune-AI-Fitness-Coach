import mongoose, { type Model, Schema, type Types } from 'mongoose';

import {
  experienceLevels,
  fitnessGoals,
  userRoles,
  userStatuses,
  type ExperienceLevel,
  type FitnessGoal,
  type UserRole,
  type UserStatus,
} from './user.types';

interface UserProfilePersistence {
  age: number | null;
  calorieGoal: number | null;
  carbsGoalG: number | null;
  experienceLevel: ExperienceLevel;
  fatsGoalG: number | null;
  fitnessGoal: FitnessGoal;
  heightCm: number | null;
  proteinGoalG: number | null;
  timezone: string;
  weightKg: number | null;
}

interface GoogleIdentityPersistence {
  email: string;
  linkedAt: Date;
  subject: string;
}

interface UserProvidersPersistence {
  google?: GoogleIdentityPersistence;
}

export interface UserPersistence {
  _id: Types.ObjectId;
  createdAt: Date;
  email: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  legacyId?: number;
  name: string;
  passwordHash?: string;
  profile: UserProfilePersistence;
  providers: UserProvidersPersistence;
  role: UserRole;
  sessionVersion: number;
  status: UserStatus;
  updatedAt: Date;
}

const profileSchema = new Schema<UserProfilePersistence>(
  {
    age: { default: null, max: 100, min: 13, type: Number },
    calorieGoal: { default: null, max: 20_000, min: 1, type: Number },
    carbsGoalG: { default: null, max: 2_000, min: 1, type: Number },
    experienceLevel: {
      default: 'beginner',
      enum: experienceLevels,
      required: true,
      type: String,
    },
    fatsGoalG: { default: null, max: 2_000, min: 1, type: Number },
    fitnessGoal: {
      default: 'general_fitness',
      enum: fitnessGoals,
      required: true,
      type: String,
    },
    heightCm: { default: null, max: 250, min: 80, type: Number },
    proteinGoalG: { default: null, max: 2_000, min: 1, type: Number },
    timezone: { default: 'UTC', maxlength: 64, required: true, type: String },
    weightKg: { default: null, max: 300, min: 25, type: Number },
  },
  { _id: false },
);

const googleIdentitySchema = new Schema<GoogleIdentityPersistence>(
  {
    email: { maxlength: 254, required: true, type: String },
    linkedAt: { required: true, type: Date },
    subject: { maxlength: 255, required: true, type: String },
  },
  { _id: false },
);

const providersSchema = new Schema<UserProvidersPersistence>(
  {
    google: { type: googleIdentitySchema },
  },
  { _id: false },
);

const userSchema = new Schema<UserPersistence>(
  {
    email: {
      lowercase: true,
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
    },
    emailVerifiedAt: { default: null, type: Date },
    lastLoginAt: { default: null, type: Date },
    legacyId: { min: 1, type: Number },
    name: { maxlength: 120, minlength: 2, required: true, trim: true, type: String },
    passwordHash: { maxlength: 512, select: false, type: String },
    profile: { default: () => ({}), required: true, type: profileSchema },
    providers: { default: () => ({}), required: true, type: providersSchema },
    role: { default: 'user', enum: userRoles, index: true, required: true, type: String },
    sessionVersion: { default: 0, min: 0, required: true, type: Number },
    status: {
      default: 'active',
      enum: userStatuses,
      index: true,
      required: true,
      type: String,
    },
  },
  {
    collection: 'users',
    optimisticConcurrency: true,
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { name: 'users_email_unique', unique: true });
userSchema.index(
  { 'providers.google.subject': 1 },
  {
    name: 'users_google_subject_unique',
    partialFilterExpression: { 'providers.google.subject': { $type: 'string' } },
    unique: true,
  },
);
userSchema.index(
  { legacyId: 1 },
  {
    name: 'users_legacy_id_unique',
    partialFilterExpression: { legacyId: { $type: 'number' } },
    unique: true,
  },
);
userSchema.index({ role: 1, status: 1, createdAt: -1 }, { name: 'users_role_status_created_at' });

export const UserModel: Model<UserPersistence> =
  (mongoose.models.User as Model<UserPersistence> | undefined) ??
  mongoose.model<UserPersistence>('User', userSchema);
