import { z } from 'zod';

import { experienceLevels, fitnessGoals } from '../users/user.types';

const nullablePositiveGoal = z.number().int().min(1).max(2_000).nullable().optional();

const isValidTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const profileUpdateBodySchema = z
  .object({
    age: z.number().int().min(13).max(100).nullable().optional(),
    calorie_goal: z.number().int().min(1).max(20_000).nullable().optional(),
    carbs_goal_g: nullablePositiveGoal,
    experience_level: z.enum(experienceLevels).optional(),
    fats_goal_g: nullablePositiveGoal,
    fitness_goal: z.enum(fitnessGoals).optional(),
    height_cm: z.number().min(80).max(250).nullable().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    protein_goal_g: nullablePositiveGoal,
    timezone: z.string().trim().min(1).max(64).refine(isValidTimezone).optional(),
    weight_kg: z.number().min(25).max(300).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field is required',
  });

export type ProfileUpdateBody = z.infer<typeof profileUpdateBodySchema>;
