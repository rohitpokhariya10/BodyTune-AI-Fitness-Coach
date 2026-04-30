import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authService } from "@/features/auth/services/authService";
import type {
  AuthMessageResponse,
  AuthResponse,
  AuthRole,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  LoginResult,
  RegisterPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
} from "@/features/auth/types";

export const authTokenStorageKey = "fitcoach_auth_token";
const authUserStorageKey = "fitcoach_auth_user";
export const authUnauthorizedEvent = "fitcoach:auth:unauthorized";

type AuthContextValue = {
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<AuthMessageResponse>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  logout: () => void;
  register: (payload: RegisterPayload) => Promise<AuthMessageResponse>;
  resendOtp: (payload: ResendOtpPayload) => Promise<AuthMessageResponse>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<AuthMessageResponse>;
  role: AuthRole | null;
  token: string | null;
  updateUser: (updates: Partial<AuthUser>) => void;
  user: AuthUser | null;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser() {
  const rawUser = localStorage.getItem(authUserStorageKey);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(authUserStorageKey);
    return null;
  }
}

function isAuthResponse(response: LoginResponse): response is AuthResponse {
  return "access_token" in response && typeof response.access_token === "string";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(authTokenStorageKey),
  );
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const persistAuth = useCallback((authResponse: AuthResponse) => {
    localStorage.setItem(authTokenStorageKey, authResponse.access_token);
    localStorage.setItem(authUserStorageKey, JSON.stringify(authResponse.user));
    setToken(authResponse.access_token);
    setUser(authResponse.user);
    return authResponse.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(authTokenStorageKey);
    localStorage.removeItem(authUserStorageKey);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      const nextUser = { ...currentUser, ...updates };
      localStorage.setItem(authUserStorageKey, JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }

    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);
    return () => {
      window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
    };
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    authService
      .me()
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }
        localStorage.setItem(authUserStorageKey, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch(() => {
        if (isMounted) {
          logout();
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [logout, token]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      const response = await authService.login(payload);

      if (isAuthResponse(response)) {
        return {
          status: "authenticated",
          user: persistAuth(response),
        };
      }

      return {
        email: response.email,
        message: response.message,
        status: "verification_required",
      };
    },
    [persistAuth],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    return authService.register(payload);
  }, []);

  const verifyOtp = useCallback(
    async (payload: VerifyOtpPayload) => {
      const response = await authService.verifyOtp(payload);
      return persistAuth(response);
    },
    [persistAuth],
  );

  const resendOtp = useCallback(async (payload: ResendOtpPayload) => {
    return authService.resendOtp(payload);
  }, []);

  const forgotPassword = useCallback(async (payload: ForgotPasswordPayload) => {
    return authService.forgotPassword(payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    return authService.resetPassword(payload);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      forgotPassword,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
      register,
      resendOtp,
      resetPassword,
      role: user?.role ?? null,
      token,
      updateUser,
      user,
      verifyOtp,
    }),
    [
      forgotPassword,
      isLoading,
      login,
      logout,
      register,
      resendOtp,
      resetPassword,
      token,
      updateUser,
      user,
      verifyOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
