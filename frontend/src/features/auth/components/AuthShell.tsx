import { CheckCircle2, ShieldCheck, UserRound } from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { AuthOrbScene, type AuthOrbColors } from "@/shared/three/AuthOrbScene";
import { BrandMark } from "@/shared/ui/BrandMark";

type AuthShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  mode?: "user" | "admin";
  sideDescription: string;
  sideTitle: string;
  title: string;
};

type AuthVisualTheme = {
  colors: AuthOrbColors;
  css: CSSProperties;
};

const authVisualThemes: Record<"green" | "orange", AuthVisualTheme> = {
  orange: {
    colors: {
      glow: "rgba(249, 115, 22, 0.14)",
      particle: "#FDBA74",
      primary: "#FF7A1A",
      secondary: "#FACC15",
      sphere: "#FFF1E6",
      sphereEmissive: "#F97316",
    },
    css: {
      "--auth-visual-border": "rgba(249, 115, 22, 0.24)",
      "--auth-visual-card-shadow": "0 14px 34px rgba(65, 45, 24, 0.1)",
      "--auth-visual-foreground": "#172033",
      "--auth-visual-glow": "rgba(249, 115, 22, 0.1)",
      "--auth-visual-muted": "#6B5E55",
      "--auth-visual-primary": "#FF7A1A",
      "--auth-visual-secondary": "#FDBA74",
      "--auth-visual-soft": "rgba(249, 115, 22, 0.11)",
      "--auth-visual-surface": "#FFF7ED",
      "--auth-visual-surface-alt": "rgba(255, 255, 255, 0.82)",
    } as CSSProperties,
  },
  green: {
    colors: {
      glow: "rgba(154, 244, 61, 0.14)",
      particle: "#B7FF3C",
      primary: "#9AF43D",
      secondary: "#22C55E",
      sphere: "#071006",
      sphereEmissive: "#9AF43D",
    },
    css: {
      "--auth-visual-border": "rgba(154, 244, 61, 0.26)",
      "--auth-visual-card-shadow": "0 14px 34px rgba(0, 0, 0, 0.22)",
      "--auth-visual-foreground": "#F8FFF4",
      "--auth-visual-glow": "rgba(154, 244, 61, 0.1)",
      "--auth-visual-muted": "rgba(248, 255, 244, 0.62)",
      "--auth-visual-primary": "#9AF43D",
      "--auth-visual-secondary": "#22C55E",
      "--auth-visual-soft": "rgba(154, 244, 61, 0.1)",
      "--auth-visual-surface": "rgba(5, 12, 7, 0.76)",
      "--auth-visual-surface-alt": "rgba(5, 10, 6, 0.7)",
    } as CSSProperties,
  },
};

export function AuthShell({
  children,
  description,
  eyebrow,
  mode = "user",
  sideDescription,
  sideTitle,
  title,
}: AuthShellProps) {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const { theme } = useTheme();
  const isAdminMode = mode === "admin";
  const visualTheme = authVisualThemes[theme === "light" ? "orange" : "green"];
  const AccentIcon = isAdminMode ? ShieldCheck : UserRound;
  const calloutTitle = isAdminMode ? "Admin workspace" : "Training workspace";
  const calloutDescription = isAdminMode
    ? "Platform content, plans, users, and protected admin routes stay separate."
    : "Workouts, nutrition, progress, and OTP-protected user access stay focused.";

  return (
    <main
      className="premium-page-bg min-h-screen overflow-hidden text-white"
      ref={scopeRef}
    >
      <div className="pointer-events-none fixed inset-0 subtle-grid opacity-55" />
      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="relative hidden overflow-hidden border-r border-white/10 p-8 lg:flex lg:flex-col lg:justify-between xl:p-10"
          style={visualTheme.css}
        >
          <div data-gsap="fade-up">
            <Link
              className="inline-flex min-h-12 items-center rounded-2xl focus-visible:ring-2 focus-visible:ring-primary"
              to="/"
            >
              <BrandMark isAdmin={isAdminMode} />
            </Link>
          </div>

          <div className="grid items-center gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div data-gsap="slide-left">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--auth-visual-primary)]">
                {isAdminMode ? "Secure admin layer" : "Secure coaching layer"}
              </p>
              <h1 className="mt-4 font-display text-5xl font-bold leading-tight xl:text-6xl">
                {sideTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/68">
                {sideDescription}
              </p>
            </div>

            <div
              className="relative h-[420px] overflow-hidden rounded-[2rem] border border-[var(--auth-visual-border)] bg-[var(--auth-visual-surface)] shadow-[var(--auth-visual-card-shadow)]"
              data-gsap="scale-in"
            >
              <div className="pointer-events-none absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--auth-visual-primary)] opacity-[0.055] blur-3xl sm:h-64 sm:w-64 xl:h-72 xl:w-72" />
              <div className="pointer-events-none absolute bottom-24 left-1/2 h-8 w-40 -translate-x-1/2 rounded-full bg-[var(--auth-visual-primary)] opacity-[0.06] blur-2xl" />
              <AuthOrbScene
                className="pointer-events-none absolute left-1/2 top-2 z-10 h-[290px] w-[290px] -translate-x-1/2 sm:top-3 sm:h-[330px] sm:w-[330px] xl:top-4 xl:h-[370px] xl:w-[370px]"
                colors={visualTheme.colors}
              />
              <div className="absolute inset-x-5 bottom-5 z-10 rounded-2xl border border-[var(--auth-visual-border)] bg-[var(--auth-visual-surface-alt)] p-4 shadow-[0_10px_24px_var(--auth-visual-glow)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--auth-visual-border)] bg-[var(--auth-visual-soft)] text-[var(--auth-visual-primary)]">
                    <AccentIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--auth-visual-foreground)]">
                      {calloutTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--auth-visual-muted)]">
                      {calloutDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2" data-gsap="card">
            {["Encrypted token session", "Email verification flow"].map((item) => (
              <div
                className="rounded-2xl border border-[var(--auth-visual-border)] bg-[var(--auth-visual-soft)] p-4"
                key={item}
              >
                <CheckCircle2 className="h-4 w-4 text-[var(--auth-visual-primary)]" />
                <p className="mt-3 text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md" data-gsap="slide-right">
            <div className="mb-7 lg:hidden">
              <Link className="inline-flex items-center gap-3" to="/">
                <BrandMark isAdmin={isAdminMode} />
              </Link>
            </div>

            <div className="glass-surface premium-card rounded-[1.75rem] p-6 shadow-premium sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {eyebrow}
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
