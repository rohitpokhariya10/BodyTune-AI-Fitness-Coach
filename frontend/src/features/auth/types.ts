export type AuthRole = "user" | "admin";

export type OtpPurpose = "register" | "forgot_password";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: AuthRole;
  is_verified: boolean;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  fitness_goal?: string | null;
  experience_level?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  admin_registration_key?: string;
  name: string;
  email: string;
  password: string;
  role?: AuthRole;
};

export type VerifyOtpPayload = {
  email: string;
  otp_code: string;
  purpose: OtpPurpose;
};

export type ResendOtpPayload = {
  email: string;
  purpose: OtpPurpose;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp_code: string;
  new_password: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type AuthMessageResponse = {
  message: string;
  email: string;
};

export type LoginResponse =
  | AuthResponse
  | {
      requires_verification: true;
      message: string;
      email: string;
    };

export type LoginResult =
  | {
      status: "authenticated";
      user: AuthUser;
    }
  | {
      status: "verification_required";
      email: string;
      message: string;
    };
