import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { PremiumButton } from "@/shared/ui/PremiumButton";
import { ApiClientError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthRoleSegmentedControl } from "@/features/auth/components/AuthRoleSegmentedControl";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { Input } from "@/shared/ui/Input";
import { Label } from "@/shared/ui/Label";
import { Toast } from "@/shared/ui/Toast";
import type { AuthRole, RegisterPayload } from "@/features/auth/types";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-carbon-950/72 px-3 text-sm text-white placeholder:text-white/35 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [accountMode, setAccountMode] = useState<AuthRole>("user");
  const [form, setForm] = useState({
    adminRegistrationKey: "",
    confirmPassword: "",
    email: "",
    name: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(auth.role === "admin" ? "/admin" : "/dashboard", {
        replace: true,
      });
    }
  }, [auth.isAuthenticated, auth.role, navigate]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectMode(nextMode: AuthRole) {
    setAccountMode(nextMode);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (accountMode === "admin" && !form.adminRegistrationKey.trim()) {
      setError("Admin registration key is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const registerPayload: RegisterPayload = {
        email: form.email,
        name: form.name,
        password: form.password,
        role: accountMode,
      };
      if (accountMode === "admin") {
        registerPayload.admin_registration_key = form.adminRegistrationKey.trim();
      }

      const response = await auth.register(registerPayload);
      navigate("/verify-otp", {
        state: {
          email: response.email,
          message: "OTP sent to your email.",
          purpose: "register",
        },
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Could not create account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAdminMode = accountMode === "admin";
  const title = isAdminMode ? "Create Admin Account" : "Create User Account";
  const description = isAdminMode
    ? "Create an admin workspace account. Admin key is required."
    : "Create your fitness account and verify your email with OTP.";

  return (
    <AuthShell
      description={description}
      eyebrow={isAdminMode ? "Admin account" : "User account"}
      mode={accountMode}
      sideDescription={
        isAdminMode
          ? "Protected admin onboarding keeps platform controls behind a registration key and OTP verification."
          : "A clean onboarding path for training, nutrition, library access, and profile-based coaching setup."
      }
      sideTitle={
        isAdminMode
          ? "Create a protected admin workspace."
          : "Start with a verified training identity."
      }
      title={title}
    >
          <form className="space-y-3" onSubmit={handleSubmit}>
            <AuthRoleSegmentedControl
              onChange={selectMode}
              value={accountMode}
            />

            <div className="space-y-2">
              <Label htmlFor="register-name">Name</Label>
              <Input
                className={inputClassName}
                id="register-name"
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name"
                required
                value={form.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                autoComplete="email"
                className={inputClassName}
                id="register-email"
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={form.email}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  autoComplete="new-password"
                  className={inputClassName}
                  id="register-password"
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="At least 8 characters"
                  required
                  type="password"
                  value={form.password}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirm</Label>
                <Input
                  autoComplete="new-password"
                  className={inputClassName}
                  id="register-confirm-password"
                  onChange={(event) =>
                    updateField("confirmPassword", event.target.value)
                  }
                  placeholder="Repeat password"
                  required
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
            </div>

            {isAdminMode ? (
              <div className="space-y-2">
                <Label htmlFor="register-admin-key">Admin registration key</Label>
                <div className="relative">
                  <KeyRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                  />
                  <Input
                    autoComplete="off"
                    className={`${inputClassName} pl-10`}
                    id="register-admin-key"
                    onChange={(event) =>
                      updateField("adminRegistrationKey", event.target.value)
                    }
                    placeholder="Enter protected admin key"
                    required
                    type="password"
                    value={form.adminRegistrationKey}
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <Toast message={error} variant="destructive" />
            ) : null}

            <PremiumButton
              className="w-full"
              disabled={isSubmitting}
              icon={isSubmitting ? LoaderCircle : ArrowRight}
              type="submit"
            >
              {isSubmitting ? "Sending OTP" : title}
            </PremiumButton>
          </form>

          <p className="mt-5 text-center text-sm text-white/52">
            {isAdminMode
              ? "Admin access is verified by key and email OTP."
              : "User accounts are created with training access only."}
          </p>

          <p className="mt-3 text-center text-sm text-white/52">
            Already registered?{" "}
            <Link className="font-semibold text-primary" to="/login">
              Login
            </Link>
          </p>
    </AuthShell>
  );
}
