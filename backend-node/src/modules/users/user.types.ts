export const userRoles = ['user', 'admin'] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ['active', 'suspended', 'deleted'] as const;
export type UserStatus = (typeof userStatuses)[number];

export const fitnessGoals = ['general_fitness', 'strength', 'weight_loss', 'mobility'] as const;
export type FitnessGoal = (typeof fitnessGoals)[number];

export const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof experienceLevels)[number];

export interface UserProfileEntity {
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

export interface GoogleIdentityEntity {
  email: string;
  linkedAt: Date;
  subject: string;
}

export interface UserEntity {
  createdAt: Date;
  email: string;
  emailVerifiedAt: Date | null;
  googleIdentity?: GoogleIdentityEntity;
  id: string;
  lastLoginAt: Date | null;
  legacyId?: number;
  name: string;
  passwordHash?: string;
  profile: UserProfileEntity;
  role: UserRole;
  sessionVersion: number;
  status: UserStatus;
  updatedAt: Date;
}

export interface SafeUserDto {
  age: number | null;
  created_at: string;
  email: string;
  experience_level: ExperienceLevel;
  fitness_goal: FitnessGoal;
  height_cm: number | null;
  id: string;
  is_verified: boolean;
  name: string;
  role: UserRole;
  updated_at: string;
  weight_kg: number | null;
}

export interface UserProfileDto {
  age: number | null;
  calorie_goal: number | null;
  carbs_goal_g: number | null;
  created_at: string;
  experience_level: ExperienceLevel;
  fats_goal_g: number | null;
  fitness_goal: FitnessGoal;
  height_cm: number | null;
  id: string;
  name: string;
  protein_goal_g: number | null;
  timezone: string;
  updated_at: string;
  weight_kg: number | null;
}

export interface CreateLocalUserInput {
  email: string;
  name: string;
  passwordHash: string;
  profile?: Partial<UserProfileEntity>;
}

export interface GoogleIdentityInput {
  displayName: string;
  email: string;
  emailVerified: boolean;
  subject: string;
}

export interface UserProfilePersistenceUpdate {
  age?: number | null;
  calorieGoal?: number | null;
  carbsGoalG?: number | null;
  experienceLevel?: ExperienceLevel;
  fatsGoalG?: number | null;
  fitnessGoal?: FitnessGoal;
  heightCm?: number | null;
  name?: string;
  proteinGoalG?: number | null;
  timezone?: string;
  weightKg?: number | null;
}
