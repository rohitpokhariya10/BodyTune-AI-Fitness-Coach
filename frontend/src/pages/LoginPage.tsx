import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ApiClientError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthRoleSegmentedControl } from "@/features/auth/components/AuthRoleSegmentedControl";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { Input } from "@/shared/ui/Input";
import { Label } from "@/shared/ui/Label";
import { Toast } from "@/shared/ui/Toast";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white placeholder:text-white/35 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type LoginMode = "user" | "admin";

function getTargetPath(role: "user" | "admin") {
  return role === "admin" ? "/admin" : "/dashboard";
}

function getSafeUserTarget(from: string | undefined) {
  if (!from || from.startsWith("/admin") || from === "/login") {
    return "/dashboard";
  }

  return from;
}

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = location.pathname.startsWith("/admin/login")
    ? "admin"
    : "user";
  const [loginMode, setLoginMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated && auth.role && !isSubmitting && !notice) {
      navigate(getTargetPath(auth.role), { replace: true });
    }
  }, [auth.isAuthenticated, auth.role, isSubmitting, navigate, notice]);

  useEffect(() => {
    setLoginMode(initialMode);
  }, [initialMode]);

  function selectMode(nextMode: LoginMode) {
    setLoginMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function submitLogin(
    nextEmail = email,
    nextPassword = password,
  ) {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const result = await auth.login({
        email: nextEmail,
        password: nextPassword,
      });
      if (result.status === "verification_required") {
        navigate("/verify-otp", {
          state: {
            email: result.email,
            message: result.message,
            purpose: "register",
          },
        });
        return;
      }

      const from = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname;

      if (loginMode === "admin" && result.user.role !== "admin") {
        auth.logout();
        setError("This account is a user account. Please use User Login.");
        return;
      }

      if (loginMode === "user" && result.user.role === "admin") {
        setNotice("Admin account detected. Redirecting to admin panel.");
        window.setTimeout(() => {
          navigate("/admin", { replace: true });
        }, 650);
        return;
      }

      navigate(
        result.user.role === "admin"
          ? "/admin"
          : getSafeUserTarget(from),
        { replace: true },
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLogin();
  }

  return (
    <AuthShell
      description={
        loginMode === "admin"
          ? "Manage videos, plans, users, and platform content."
          : "Access your workouts, nutrition, progress, and coaching."
      }
      eyebrow={loginMode === "admin" ? "Admin Login" : "User Login"}
      mode={loginMode}
      sideDescription={
        loginMode === "admin"
          ? "A focused control surface for platform content, subscriptions, and operational review."
          : "Train with live camera coaching, review nutrition, and keep progress moving from one polished workspace."
      }
      sideTitle={
        loginMode === "admin"
          ? "Admin access for platform management."
          : "Your training workspace starts here."
      }
      title={loginMode === "admin" ? "Admin Login" : "User Login"}
    >
            <AuthRoleSegmentedControl
              className="mb-5"
              onChange={selectMode}
              value={loginMode}
            />

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  autoComplete="email"
                  className={inputClassName}
                  id="login-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  autoComplete="current-password"
                  className={inputClassName}
                  id="login-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={password}
                />
              </div>

              {error ? (
                <Toast message={error} variant="destructive" />
              ) : null}
              {notice ? (
                <Toast message={notice} variant="success" />
              ) : null}

              <PremiumButton
                className="w-full"
                disabled={isSubmitting}
                icon={isSubmitting ? LoaderCircle : loginMode === "admin" ? ShieldCheck : ArrowRight}
                type="submit"
              >
                {isSubmitting
                  ? "Signing in"
                  : loginMode === "admin"
                    ? "Enter Admin Workspace"
                    : "Sign In"}
              </PremiumButton>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link className="font-semibold text-primary" to="/forgot-password">
                Forgot password?
              </Link>
              <Link className="font-semibold text-white/68" to="/register">
                Create account
              </Link>
            </div>

            <p className="mt-5 text-center text-sm text-white/52">
              {loginMode === "admin"
                ? "Admin accounts are seeded and managed separately."
                : "Unverified account? Signing in will send a new OTP to your email."}
            </p>
    </AuthShell>
  );
}
