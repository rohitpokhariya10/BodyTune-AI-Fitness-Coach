import {
  ArrowRight,
  BookOpenText,
  Camera,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  LineChart,
  Menu,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Utensils,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { useTheme } from "@/shared/theme/ThemeProvider";
import { Logo } from "@/shared/ui/Logo";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { cn } from "@/shared/utils";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#results", label: "Results" },
];

const featureCards: Array<{
  description: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    description: "Camera-based movement analysis with real-time correction cues for safer reps.",
    icon: Camera,
    title: "Posture Tracking",
  },
  {
    description: "Adaptive plans that adjust to your goal, readiness, history, and form quality.",
    icon: Dumbbell,
    title: "Smart Workouts",
  },
  {
    description: "Macro targets, meal context, and calorie guidance connected to your training.",
    icon: Utensils,
    title: "Nutrition Insights",
  },
  {
    description: "Clear streaks, strength trends, body metrics, and weekly performance signals.",
    icon: LineChart,
    title: "Progress Analytics",
  },
  {
    description: "Curated premium coaching flows, expert videos, and role-based content control.",
    icon: BookOpenText,
    title: "Premium Content",
  },
];

const capabilityCards: Array<{
  chips: string[];
  description: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    chips: ["Posture", "Reps", "Angles"],
    description: "Track form, reps, and joint movement with camera-based feedback.",
    icon: Camera,
    title: "Pose Intelligence",
  },
  {
    chips: ["Plans", "Sessions", "Results"],
    description: "Guide users through structured sessions and save workout history.",
    icon: Dumbbell,
    title: "Smart Workout Flow",
  },
  {
    chips: ["Meals", "Macros", "Goals"],
    description: "Log meals, calories, protein, carbs, fats, and daily targets.",
    icon: Utensils,
    title: "Nutrition Tracking",
  },
  {
    chips: ["Videos", "Plans", "Access"],
    description: "Upload and manage premium workout videos through ImageKit.",
    icon: ShieldCheck,
    title: "Admin Media Control",
  },
];

const benefitCards = [
  {
    metric: "96%",
    text: "average form confidence on guided sessions",
  },
  {
    metric: "3.2x",
    text: "more consistent weekly training with adaptive plans",
  },
  {
    metric: "24/7",
    text: "coaching signals across workouts, food, and recovery",
  },
];

function SectionShell({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} id={id}>
      {children}
    </section>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="focus-ring hidden h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground shadow-inner-glass transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground sm:inline-flex"
      onClick={toggleTheme}
      type="button"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/82 backdrop-blur-2xl" data-gsap="fade-up">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link className="focus-ring flex min-h-11 items-center rounded-2xl" to="/">
          <Logo subtitle="" />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 px-1.5 py-1.5 shadow-inner-glass lg:flex"
        >
          {navItems.map((item) => (
            <a
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            className="focus-ring hidden min-h-11 items-center rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-card hover:text-foreground md:inline-flex"
            to="/login"
          >
            Log in
          </Link>
          <PremiumButton className="hidden sm:inline-flex" to="/register">
            Start coaching
          </PremiumButton>
          <button
            aria-label="Open menu"
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground shadow-inner-glass lg:hidden"
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <SectionShell className="pb-14 pt-12 text-center sm:pb-16 lg:pb-20 lg:pt-16">
      <div className="mx-auto max-w-3xl">
        <p
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/22 bg-primary/[0.075] px-3.5 text-sm font-bold text-primary"
          data-gsap="fade-up"
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          AI-Powered Fitness Coach
        </p>

        <h1
          className="mt-6 font-display text-[clamp(3rem,7vw,4.9rem)] font-bold leading-[0.98] text-foreground"
          data-gsap="fade-up"
        >
          Your body.
          <span className="mt-2 block text-primary">Optimized by AI.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-[42rem] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8" data-gsap="fade-up">
          BodyTune AI analyzes your form, personalizes your training, and adapts in real time so you can train smarter, recover better, and stay consistent.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row" data-gsap="fade-up">
          <PremiumButton icon={ArrowRight} to="/register">
            Start free coaching
          </PremiumButton>
          <a className="btn-secondary focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold" href="#how-it-works">
            <Play aria-hidden="true" className="h-4 w-4" />
            See how it works
          </a>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-sm text-muted-foreground" data-gsap="fade-up">
          <span className="flex items-center gap-1 text-primary" aria-label="Five star rating">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star aria-hidden="true" className="h-4 w-4 fill-current" key={index} />
            ))}
          </span>
          <span className="font-semibold text-foreground/78">4.9/5 from 8,500+ users</span>
        </div>

        <div className="mx-auto mt-7 grid max-w-lg grid-cols-3 gap-3 text-center" data-gsap="fade-up">
          {["FitLab", "Forbes", "Wellness+"].map((logo) => (
            <div className="rounded-2xl border border-border/70 bg-card/60 px-3 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-inner-glass" key={logo}>
              {logo}
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function CapabilityCard({ chips, description, icon: Icon, title }: (typeof capabilityCards)[number]) {
  return (
    <article className="group flex min-h-[250px] flex-col rounded-[1.35rem] border border-border/70 bg-card/70 p-5 shadow-soft-panel transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.035] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-inner-glass transition group-hover:border-primary/40 group-hover:bg-primary/15">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          Platform
        </span>
      </div>
      <h3 className="mt-6 font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {chips.map((chip) => (
          <span
            className="rounded-full border border-border/70 bg-[var(--app-subtle)] px-3 py-1.5 text-xs font-bold text-muted-foreground transition group-hover:border-primary/25 group-hover:text-foreground"
            key={chip}
          >
            {chip}
          </span>
        ))}
      </div>
    </article>
  );
}

function ProductCapabilitiesSection() {
  return (
    <SectionShell className="py-14 sm:py-16 lg:py-20" id="platform">
      <div className="overflow-hidden rounded-[1.7rem] border border-primary/16 bg-[radial-gradient(circle_at_18%_0%,hsl(var(--primary)/0.045),transparent_32%),var(--app-card)] p-5 shadow-soft-panel sm:p-8 lg:p-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              Platform capabilities
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Everything your fitness coach needs in one workspace
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            BodyTune AI connects posture feedback, nutrition tracking, workout guidance, and progress analytics into one role-based training platform.
          </p>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {capabilityCards.map((capability) => (
            <CapabilityCard {...capability} key={capability.title} />
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <PremiumButton icon={ArrowRight} to="/register">
            Start coaching
          </PremiumButton>
          <a className="btn-secondary focus-ring inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" href="#features">
            Explore features
          </a>
        </div>
      </div>
    </SectionShell>
  );
}

function FeatureCard({ description, icon: Icon, title }: (typeof featureCards)[number]) {
  return (
    <article className="group flex min-h-[220px] flex-col rounded-[1.35rem] border border-border/70 bg-card/72 p-5 shadow-soft-panel transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.035]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary transition group-hover:border-primary/40 group-hover:bg-primary/15">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <span className="mt-auto pt-5 text-primary/80 transition group-hover:translate-x-1">
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </article>
  );
}

function FeatureGrid() {
  return (
    <SectionShell className="py-16 sm:py-20" id="features">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Everything you need</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            One connected coaching system for form, food, and progress.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          BodyTune AI keeps the full loop visible, from rep-level feedback to nutrition and premium coaching content.
        </p>
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {featureCards.map((feature) => (
          <FeatureCard {...feature} key={feature.title} />
        ))}
      </div>
    </SectionShell>
  );
}

function BenefitsSection() {
  const benefits = [
    "Instant form feedback before bad habits become injuries.",
    "Personalized workouts that adapt as your performance changes.",
    "Meal tracking and macro insights connected to your goals.",
    "Role-based dashboards for members, coaches, and admins.",
  ];

  return (
    <SectionShell className="py-16 sm:py-20" id="how-it-works">
      <div className="grid gap-10 rounded-[1.7rem] border border-border/70 bg-card/62 p-5 shadow-soft-panel sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Why it works</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Coaching that reacts to what your body is actually doing.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Most fitness apps stop at plans and videos. BodyTune AI closes the gap with computer vision, nutrition context, analytics, and content tools in one polished workspace.
          </p>

          <div className="mt-7 grid gap-3">
            {benefits.map((benefit) => (
              <div className="flex items-start gap-3" key={benefit}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                </span>
                <p className="text-sm leading-6 text-foreground/78">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {benefitCards.map((card) => (
              <div className="rounded-[1.25rem] border border-border/70 bg-background/48 p-5 shadow-inner-glass" key={card.metric}>
                <p className="font-display text-3xl font-bold text-primary">{card.metric}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.35rem] border border-primary/18 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.045),transparent_38%),var(--app-card)] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Role-based control</p>
                <h3 className="mt-2 font-display text-xl font-bold text-foreground">Member, coach, and admin views stay in sync.</h3>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Plans", "Content", "Results"].map((label) => (
                <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3" key={label}>
                  <p className="text-sm font-bold text-foreground">{label}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-3/4 rounded-full bg-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function CTASection() {
  return (
    <SectionShell className="py-16 sm:py-20" id="pricing">
      <div className="overflow-hidden rounded-[1.7rem] border border-primary/18 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.06),transparent_32%),linear-gradient(135deg,var(--app-card),var(--app-elevated-solid))] p-6 shadow-soft-panel sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Zap aria-hidden="true" className="h-3.5 w-3.5" />
              Start smarter
            </p>
            <h2 className="mt-5 max-w-2xl font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
              Start training with smarter feedback.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Track your form, food, and progress in one place with coaching that gets sharper every week.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <PremiumButton icon={ArrowRight} to="/register">
              Start free coaching
            </PremiumButton>
            <Link className="btn-secondary focus-ring inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-bold" to="/login">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function LandingFooter() {
  const productLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "Results" },
    { href: "#pricing", label: "Pricing" },
    { href: "#platform", label: "Blog" },
  ];
  const legalLinks = [
    { href: "#privacy", label: "Privacy" },
    { href: "#terms", label: "Terms" },
    { href: "#security", label: "Security" },
  ];

  return (
    <footer className="border-t border-border/70 bg-[linear-gradient(180deg,transparent,var(--app-panel))] py-12 sm:py-14">
      <SectionShell>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_0.8fr] lg:gap-12">
          <div className="max-w-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Brand
            </p>
            <Logo subtitle="AI fitness coaching" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Premium AI coaching for movement, nutrition, analytics, and role-based fitness experiences.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Product
            </p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <a
                  className="w-fit transition hover:text-primary"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Contact
            </p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <a className="w-fit transition hover:text-primary" href="tel:9012464329">
                Phone: 9012464329
              </a>
              <a
                className="w-fit break-all transition hover:text-primary"
                href="mailto:hello@rohitpokhariya.in"
              >
                Email: hello@rohitpokhariya.in
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Legal
            </p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <a
                  className="w-fit transition hover:text-primary"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 BodyTune AI. All rights reserved.</p>
          <p>Built for consistent training and measurable progress.</p>
        </div>
      </SectionShell>
    </footer>
  );
}

export default function LandingPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground" ref={scopeRef}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_9%,hsl(var(--primary)/0.045),transparent_26%),radial-gradient(circle_at_86%_10%,hsl(var(--accent)/0.025),transparent_22%),linear-gradient(180deg,var(--app-bg)_0%,var(--app-panel)_48%,var(--app-bg)_100%)]" />
      <div className="pointer-events-none fixed inset-0 subtle-grid opacity-55" />

      <div className="relative z-10">
        <LandingNavbar />
        <main>
          <HeroSection />
          <ProductCapabilitiesSection />
          <FeatureGrid />
          <BenefitsSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
