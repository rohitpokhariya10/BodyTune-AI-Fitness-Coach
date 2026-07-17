import { z } from 'zod';

import { experienceLevels, fitnessGoals } from '../users/user.types';

const normalizedEmail = z
  .string()
  .trim()
  .min(5)
  .max(254)
  .email('Enter a valid email address')
  .transform((email) => email.toLowerCase());

const password = z.string().min(8).max(128);
const otpCode = z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit verification code');

export const registerBodySchema = z
  .object({
    age: z.number().int().min(13).max(100).nullable().optional(),
    email: normalizedEmail,
    experience_level: z.enum(experienceLevels).nullable().optional(),
    fitness_goal: z.enum(fitnessGoals).nullable().optional(),
    height_cm: z.number().min(80).max(250).nullable().optional(),
    name: z.string().trim().min(2).max(120),
    password,
    role: z.literal('user').optional(),
    weight_kg: z.number().min(25).max(300).nullable().optional(),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: normalizedEmail,
    password: z.string().min(1).max(128),
  })
  .strict();

export const verifyOtpBodySchema = z
  .object({
    email: normalizedEmail,
    otp_code: otpCode,
    purpose: z.literal('register'),
  })
  .strict();

export const resendOtpBodySchema = z
  .object({
    email: normalizedEmail,
    purpose: z.enum(['register', 'forgot_password']),
  })
  .strict();

export const forgotPasswordBodySchema = z.object({ email: normalizedEmail }).strict();

export const resetPasswordBodySchema = z
  .object({
    email: normalizedEmail,
    new_password: password,
    otp_code: otpCode,
  })
  .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
