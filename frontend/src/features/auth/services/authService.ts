import { apiClient } from "@/shared/api/client";
import type {
  AuthMessageResponse,
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
} from "@/features/auth/types";

export const authService = {
  forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient.request<AuthMessageResponse>("/api/v1/auth/forgot-password", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  login(payload: LoginPayload) {
    return apiClient.request<LoginResponse>("/api/v1/auth/login", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  me() {
    return apiClient.request<AuthResponse["user"]>("/api/v1/auth/me");
  },

  register(payload: RegisterPayload) {
    return apiClient.request<AuthMessageResponse>("/api/v1/auth/register", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  resendOtp(payload: ResendOtpPayload) {
    return apiClient.request<AuthMessageResponse>("/api/v1/auth/resend-otp", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiClient.request<AuthMessageResponse>("/api/v1/auth/reset-password", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiClient.request<AuthResponse>("/api/v1/auth/verify-otp", {
      body: JSON.stringify(payload),
      method: "POST",
    });
  },
};
