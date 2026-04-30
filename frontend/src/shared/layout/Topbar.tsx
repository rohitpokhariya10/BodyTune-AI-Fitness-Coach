import { useEffect, useState } from "react";
import { LogOut, Menu, Server } from "lucide-react";
import { useLocation } from "react-router-dom";

import { apiClient } from "@/shared/api/client";
import { BrandMark } from "@/shared/ui/BrandMark";
import {
  adminNavigationItems,
  navigationItems,
} from "@/shared/constants/navigation";
import type { BackendHealthStatus } from "@/shared/types";

const fallbackTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/admin": "Admin Dashboard",
  "/admin/settings": "Settings",
  "/profile": "Profile",
  "/workouts": "Workouts",
  "/workouts/live": "Live Session",
  "/diet": "Nutrition",
  "/library": "Exercise Library",
  "/subscription": "Subscription",
  "/results": "Results",
  "/settings": "Settings",
};

function getPageTitle(pathname: string, isAdmin: boolean) {
  if (pathname.startsWith("/library/videos/")) {
    return "Video Watch";
  }

  const items = isAdmin ? adminNavigationItems : navigationItems;

  return (
    items.find((item) => item.href === pathname)?.label ??
    fallbackTitles[pathname] ??
    "AI Fitness Coach"
  );
}

type TopbarProps = {
  isAdmin: boolean;
  onMobileMenuOpen: () => void;
  onLogout: () => void;
  roleLabel: string;
  userName: string;
};

export function Topbar({
  isAdmin,
  onLogout,
  onMobileMenuOpen,
  roleLabel,
  userName,
}: TopbarProps) {
  const { pathname } = useLocation();
  const title = getPageTitle(pathname, isAdmin);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  useEffect(() => {
    let isMounted = true;

    apiClient
      .request<BackendHealthStatus>("/health")
      .then((health) => {
        if (isMounted && health.status === "ok") {
          setBackendStatus("online");
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendStatus("offline");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const statusStyles = {
    checking: "bg-white/45",
    online: "bg-volt-400",
    offline: "bg-destructive",
  };
  const workspaceLabel = isAdmin ? "Admin workspace" : "Training workspace";
  const roleBadgeClassName = isAdmin
    ? "border-primary/20 bg-primary/10 text-primary"
    : "border-volt-400/20 bg-volt-400/10 text-volt-400";
  const avatarClassName = isAdmin
    ? "bg-premium-line text-white"
    : "bg-nutrition-line text-carbon-950";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[var(--app-topbar)] px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Open navigation"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70 text-foreground md:hidden"
            onClick={onMobileMenuOpen}
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="hidden min-w-0 md:block">
            <p className="text-xs font-medium text-muted-foreground">
              {workspaceLabel}
            </p>
            <h1 className="mt-0.5 truncate font-display text-xl font-bold leading-tight text-foreground">
              {title}
            </h1>
          </div>
          <BrandMark className="md:hidden" compact />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden min-h-10 items-center gap-2 rounded-full border border-border bg-[var(--app-subtle)] px-3 text-sm font-semibold text-muted-foreground lg:flex">
            <Server aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${statusStyles[backendStatus]}`}
            />
            <span className="capitalize">{backendStatus}</span>
          </div>
          <div className="hidden min-h-11 items-center gap-3 rounded-2xl border border-border bg-[var(--app-subtle)] px-2.5 text-sm text-muted-foreground shadow-inner-glass sm:flex">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarClassName}`}>
              {userName.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-36 truncate font-semibold text-foreground">{userName}</span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${roleBadgeClassName}`}>
              {roleLabel}
            </span>
            <button
              className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-[var(--app-subtle)] px-2.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-[var(--app-subtle-hover)] hover:text-foreground"
              onClick={onLogout}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
          <button
            aria-label="Logout"
            className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground sm:hidden"
            onClick={onLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
