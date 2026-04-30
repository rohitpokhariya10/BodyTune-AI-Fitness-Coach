import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ApiClientError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthShell } from "@/features/auth/components/AuthShell";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white placeholder:text-white/35 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type ResetState = {
  email?: string;
  message?: string;
};

export default function ResetPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResetState | null) ?? {};
  const [email, setEmail] = useState(state.email ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(state.message ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.resetPassword({
        email,
        new_password: password,
        otp_code: otp,
      });
      setSuccess("Password reset successful. Redirecting to login.");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 700);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Invalid OTP. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      description="Use your reset code and create a new password for your account."
      eyebrow="Secure reset"
      sideDescription="Password recovery uses the same protected OTP flow while preserving the current auth and route behavior."
      sideTitle="Reopen your training workspace safely."
      title="Reset password"
    >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            autoComplete="email"
            className={inputClassName}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            type="email"
            value={email}
          />
          <input
            className="min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-center text-lg font-semibold text-white placeholder:text-white/28 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit code"
            required
            value={otp}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              autoComplete="new-password"
              className={inputClassName}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              required
              type="password"
              value={password}
            />
            <input
              autoComplete="new-password"
              className={inputClassName}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          {success ? (
            <p className="rounded-2xl border border-volt-400/20 bg-volt-400/10 p-3 text-sm text-volt-400">
              {success}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-ember-400/25 bg-ember-400/10 p-3 text-sm text-ember-400">
              {error}
            </p>
          ) : null}

          <PremiumButton
            className="w-full"
            disabled={isSubmitting}
            icon={isSubmitting ? LoaderCircle : ArrowRight}
            type="submit"
          >
            {isSubmitting ? "Resetting" : "Reset Password"}
          </PremiumButton>
        </form>

        <p className="mt-5 text-center text-sm text-white/52">
          Need another OTP?{" "}
          <Link className="font-semibold text-primary" to="/forgot-password">
            Start over
          </Link>
        </p>
    </AuthShell>
  );
}
