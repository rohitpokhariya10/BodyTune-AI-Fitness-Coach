import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ApiClientError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthShell } from "@/features/auth/components/AuthShell";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white placeholder:text-white/35 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await auth.forgotPassword({ email });
      navigate("/reset-password", {
        state: {
          email: response.email,
          message: "If this email is registered, an OTP has been sent.",
        },
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Could not send reset OTP. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      description="Request a password reset code for your account email."
      eyebrow="Password recovery"
      sideDescription="Recovery stays inside the same secure email verification flow used for account onboarding."
      sideTitle="Reset access without interrupting the product."
      title="Forgot password"
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
            {isSubmitting ? "Sending OTP" : "Send Reset OTP"}
          </PremiumButton>
        </form>

        <p className="mt-5 text-center text-sm text-white/52">
          Remembered it?{" "}
          <Link className="font-semibold text-primary" to="/login">
            Login
          </Link>
        </p>
    </AuthShell>
  );
}
