import type { SafeUserDto } from '../users/user.types';

export const otpPurposes = ['register', 'forgot_password'] as const;
export type OtpPurpose = (typeof otpPurposes)[number];

export interface SessionPrincipal {
  sessionVersion: number;
  userId: string;
}

export interface AuthenticatedIdentity {
  principal: SessionPrincipal;
  user: SafeUserDto;
}

export interface RegisterInput {
  age?: number | null | undefined;
  email: string;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | null | undefined;
  fitness_goal?: 'general_fitness' | 'strength' | 'weight_loss' | 'mobility' | null | undefined;
  height_cm?: number | null | undefined;
  name: string;
  password: string;
  role?: 'user' | undefined;
  weight_kg?: number | null | undefined;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyOtpInput {
  email: string;
  otp_code: string;
  purpose: 'register';
}

export interface ResendOtpInput {
  email: string;
  purpose: OtpPurpose;
}

export interface ResetPasswordInput {
  email: string;
  new_password: string;
  otp_code: string;
}

export interface AuthMessageData {
  email: string;
}

export interface RegisterResult extends AuthMessageData {
  requires_verification: true;
}

export type LoginResult =
  | ({ status: 'authenticated' } & AuthenticatedIdentity)
  | {
      email: string;
      requires_verification: true;
      status: 'verification_required';
    };

export interface PasswordHasher {
  burn(password: string): Promise<void>;
  hash(password: string): Promise<string>;
  needsRehash(encodedHash: string): boolean;
  verify(password: string, encodedHash: string): Promise<boolean>;
}

export interface OtpHasher {
  digestCode(challengeKey: string, purpose: OtpPurpose, code: string): string;
  digestEmail(email: string): string;
  verifyCode(
    challengeKey: string,
    purpose: OtpPurpose,
    code: string,
    expectedDigest: string,
  ): boolean;
}

export interface EmailGateway {
  sendOtp(input: {
    code: string;
    expiresInMinutes: number;
    purpose: OtpPurpose;
    to: string;
  }): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
