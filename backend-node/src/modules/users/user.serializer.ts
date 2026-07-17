import type { SafeUserDto, UserEntity, UserProfileDto } from './user.types';

export const serializeSafeUser = (user: UserEntity): SafeUserDto => ({
  age: user.profile.age,
  created_at: user.createdAt.toISOString(),
  email: user.email,
  experience_level: user.profile.experienceLevel,
  fitness_goal: user.profile.fitnessGoal,
  height_cm: user.profile.heightCm,
  id: user.id,
  is_verified: user.emailVerifiedAt !== null,
  name: user.name,
  role: user.role,
  updated_at: user.updatedAt.toISOString(),
  weight_kg: user.profile.weightKg,
});

export const serializeUserProfile = (user: UserEntity): UserProfileDto => ({
  age: user.profile.age,
  calorie_goal: user.profile.calorieGoal,
  carbs_goal_g: user.profile.carbsGoalG,
  created_at: user.createdAt.toISOString(),
  experience_level: user.profile.experienceLevel,
  fats_goal_g: user.profile.fatsGoalG,
  fitness_goal: user.profile.fitnessGoal,
  height_cm: user.profile.heightCm,
  id: user.id,
  name: user.name,
  protein_goal_g: user.profile.proteinGoalG,
  timezone: user.profile.timezone,
  updated_at: user.updatedAt.toISOString(),
  weight_kg: user.profile.weightKg,
});
