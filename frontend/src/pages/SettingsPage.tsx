import {
  CheckCircle2,
  LockKeyhole,
  Moon,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";

import { useTheme } from "@/shared/theme/ThemeProvider";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageHeader } from "@/shared/ui/PageHeader";

export default function SettingsPage() {
  const { isDark, setTheme, theme, toggleTheme } = useTheme();

  return (
    <div className="app-page">
      <PageHeader
        description="Personalize your workspace while keeping the product polished and readable."
        eyebrow="Settings"
        title="App preferences"
      />

      <section className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="bento-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Appearance
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Premium dark mode
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your choice is saved locally and applied instantly across the app.
              </p>
            </div>

            <button
              aria-checked={isDark}
              aria-label="Toggle premium dark mode"
              className={`focus-ring relative inline-flex h-11 w-[5.75rem] shrink-0 items-center rounded-full border p-1 transition ${
                isDark
                  ? "border-primary/35 bg-primary/[0.1] shadow-soft-panel"
                  : "border-border bg-muted"
              }`}
              onClick={toggleTheme}
              role="switch"
              type="button"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-soft-panel transition ${
                  isDark
                    ? "translate-x-[3rem] border-primary/30 bg-primary text-primary-foreground"
                    : "translate-x-0 border-border bg-card text-primary"
                }`}
              >
                {isDark ? (
                  <Moon aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Sun aria-hidden="true" className="h-4 w-4" />
                )}
              </span>
              <span className="sr-only">{isDark ? "Dark mode on" : "Dark mode off"}</span>
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              aria-pressed={isDark}
              className={`focus-ring group flex min-h-48 flex-col justify-between rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 active:translate-y-0 ${
                isDark
                  ? "selected-card"
                  : "border-border bg-[var(--app-subtle)] hover:bg-[var(--app-subtle-hover)]"
              }`}
              onClick={() => setTheme("dark")}
              type="button"
            >
              <span>
                <span className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-inner-glass">
                    <Moon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                      isDark
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {isDark ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : null}
                  </span>
                </span>
                <span className="mt-5 block">
                  <span className="block font-display text-lg font-bold text-foreground">
                    Dark workspace
                  </span>
                  <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                    The current premium dark interface with deep surfaces and luminous accents.
                  </span>
                </span>
              </span>
              <span className="mt-5 grid grid-cols-3 gap-2">
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-background shadow-inner-glass" />
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-card shadow-inner-glass" />
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-primary shadow-inner-glass" />
              </span>
            </button>

            <button
              aria-pressed={!isDark}
              className={`focus-ring group flex min-h-48 flex-col justify-between rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/45 active:translate-y-0 ${
                !isDark
                  ? "selected-card"
                  : "border-border bg-[var(--app-subtle)] hover:bg-[var(--app-subtle-hover)]"
              }`}
              onClick={() => setTheme("light")}
              type="button"
            >
              <span>
                <span className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-inner-glass">
                    <Sun aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                      !isDark
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {!isDark ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : null}
                  </span>
                </span>
                <span className="mt-5 block">
                  <span className="block font-display text-lg font-bold text-foreground">
                    Light workspace
                  </span>
                  <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                    A soft warm dashboard theme with bright cards and orange premium accents.
                  </span>
                </span>
              </span>
              <span className="mt-5 grid grid-cols-3 gap-2">
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-background shadow-inner-glass" />
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-card shadow-inner-glass" />
                <span aria-hidden="true" className="h-8 rounded-xl border border-border bg-primary shadow-inner-glass" />
              </span>
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-[var(--app-subtle)] p-4">
            <div className="flex items-start gap-3">
              <Sparkles aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                Current theme: <span className="font-bold text-foreground">{theme}</span>. This preference persists after refresh on this browser.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="bento-card p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-inner-glass">
              <Shield aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Privacy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                V1 camera note
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-border bg-[var(--app-subtle)] p-4">
            <div className="flex items-start gap-3">
              <LockKeyhole
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Camera frames are not stored in v1.
              </p>
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
