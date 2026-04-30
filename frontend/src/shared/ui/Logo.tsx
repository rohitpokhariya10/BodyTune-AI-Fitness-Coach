import { cn } from "@/shared/utils";

type LogoProps = {
  className?: string;
  iconClassName?: string;
  subtitle?: string;
  compact?: boolean;
};

export function Logo({
  className = "",
  compact = false,
  iconClassName = "",
  subtitle = "Training workspace",
}: LogoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "brand-logo-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-[var(--theme-primary-soft)] text-primary shadow-inner-glass",
          iconClassName
        )}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 64"
          className="h-7 w-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="bodytune-b-gradient"
              x1="10"
              y1="8"
              x2="54"
              y2="56"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="hsl(var(--primary))" />
              <stop offset="0.52" stopColor="hsl(var(--primary))" stopOpacity="0.92" />
              <stop offset="1" stopColor="var(--app-primary-2)" />
            </linearGradient>
            <linearGradient
              id="bodytune-panel-gradient"
              x1="8"
              y1="6"
              x2="58"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="var(--theme-surface-alt)" />
              <stop offset="1" stopColor="var(--theme-surface)" />
            </linearGradient>
          </defs>

          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="18"
            fill="url(#bodytune-panel-gradient)"
          />

          <rect
            x="4.75"
            y="4.75"
            width="54.5"
            height="54.5"
            rx="17.25"
            stroke="currentColor"
            strokeOpacity="0.42"
            strokeWidth="1.5"
          />

          <path
            d="M12 34H20.5L25.2 24.5L31.1 42L36.2 30.8H44.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.38"
            strokeWidth="3.2"
          />

          <path
            d="M19 52V12H36.2C43.7 12 48.3 16.1 48.3 22.4C48.3 26.3 46.4 29.4 43.1 31.1C47.2 32.6 49.8 36.1 49.8 40.7C49.8 47.5 44.5 52 36.4 52H19Z"
            fill="url(#bodytune-b-gradient)"
          />

          <path
            d="M28.5 28H34.8C37.6 28 39.4 26.4 39.4 24C39.4 21.6 37.6 20.1 34.8 20.1H28.5V28Z"
            fill="hsl(var(--background))"
            fillOpacity="0.96"
          />

          <path
            d="M28.5 43.8H35.7C38.8 43.8 40.8 42.1 40.8 39.4C40.8 36.7 38.8 35 35.7 35H28.5V43.8Z"
            fill="hsl(var(--background))"
            fillOpacity="0.96"
          />

          <path
            d="M14 16L19 12V52L14 48V16Z"
            fill="currentColor"
            fillOpacity="0.9"
          />

          <path
            d="M19 12H36.2C43.7 12 48.3 16.1 48.3 22.4C48.3 26.3 46.4 29.4 43.1 31.1C47.2 32.6 49.8 36.1 49.8 40.7C49.8 47.5 44.5 52 36.4 52H19V12Z"
            stroke="currentColor"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
        </svg>
      </div>

      {!compact ? (
        <span className="min-w-0">
          <span className="block truncate font-display text-base font-bold leading-tight text-foreground">
            BodyTune AI
          </span>
          {subtitle ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
