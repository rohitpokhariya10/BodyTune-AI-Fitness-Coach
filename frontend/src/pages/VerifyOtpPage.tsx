import { ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ApiClientError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { Input } from "@/shared/ui/Input";
import { Label } from "@/shared/ui/Label";
import { Select } from "@/shared/ui/Select";
import { Toast } from "@/shared/ui/Toast";
import type { OtpPurpose } from "@/features/auth/types";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-center text-lg font-semibold text-white placeholder:text-white/28 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function targetPath(role: "user" | "admin") {
  return role === "admin" ? "/admin" : "/dashboard";
}

type VerifyState = {
  email?: string;
  message?: string;
  purpose?: OtpPurpose;
};

export default function VerifyOtpPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as VerifyState | null) ?? {};
  const [email, setEmail] = useState(state.email ?? "");
  const [otp, setOtp] = useState("");
  const [purpose, setPurpose] = useState<OtpPurpose>(state.purpose ?? "register");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(state.message ?? null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && /^\d{6}$/.test(otp),
    [email, otp],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!canSubmit) {
      setError("Enter your email and a 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await auth.verifyOtp({
        email,
        otp_code: otp,
        purpose,
      });
      navigate(targetPath(user.role), { replace: true });
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

  async function handleResend() {
    if (!email.trim() || resendSeconds > 0) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsResending(true);
    try {
      await auth.resendOtp({
        email,
        purpose,
      });
      setMessage("A fresh OTP has been sent.");
      setResendSeconds(60);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Please wait before requesting another OTP.",
      );
      setResendSeconds(60);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthShell
      description="Enter the verification code sent to your email to complete the secure flow."
      eyebrow="Email verification"
      mode="user"
      sideDescription="OTP verification keeps new accounts and password recovery inside a deliberate, protected path."
      sideTitle="Confirm access without exposing training data."
      title="Verify OTP"
    >
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="otp-email">Email</Label>
            <Input
              className="min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white placeholder:text-white/35 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="otp-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp-purpose">Verification type</Label>
            <Select
              className="min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="otp-purpose"
              onChange={(event) => setPurpose(event.target.value as OtpPurpose)}
              value={purpose}
            >
              <option value="register">Account verification</option>
              <option value="forgot_password">Password reset</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp-code">6-digit code</Label>
            <Input
              className={inputClassName}
              id="otp-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter code"
              required
              value={otp}
            />
          </div>

          {message ? (
            <Toast message={message} variant="success" />
          ) : null}
          {error ? (
            <Toast message={error} variant="destructive" />
          ) : null}

          <PremiumButton
            className="w-full"
            disabled={isSubmitting || !canSubmit}
            icon={isSubmitting ? LoaderCircle : ArrowRight}
            type="submit"
          >
            {isSubmitting ? "Verifying" : "Verify and Continue"}
          </PremiumButton>
        </form>

        <button
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white/68 transition hover:border-primary/30 hover:bg-white/[0.08] hover:text-white"
          disabled={isResending || resendSeconds > 0}
          onClick={handleResend}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
        </button>

        <p className="mt-5 text-center text-sm text-white/52">
          Back to{" "}
          <Link className="font-semibold text-primary" to="/login">
            login
          </Link>
        </p>
    </AuthShell>
  );
}
