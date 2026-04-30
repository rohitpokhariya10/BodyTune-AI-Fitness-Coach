import { CheckCircle2, LogOut, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  adminNavigationItems,
  navigationItems,
} from "@/shared/constants/navigation";
import { BrandMark } from "@/shared/ui/BrandMark";
import { Sheet, SheetClose, SheetContent } from "@/shared/ui/Sheet";

function navClassName(isAdmin: boolean) {
  return ({ isActive }: { isActive: boolean }) => `focus-ring relative flex min-h-11 items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold transition ${
    isActive
      ? isAdmin
        ? "active-nav-item border-primary/45 text-white [&_svg]:text-primary"
        : "active-nav-item border-primary/45 text-white [&_svg]:text-volt-400"
      : "border-transparent text-[var(--app-sidebar-muted)] hover:border-border hover:bg-[var(--app-subtle-hover)] hover:text-[var(--app-sidebar-foreground)] [&_svg]:text-[var(--app-sidebar-muted)] hover:[&_svg]:text-[var(--app-sidebar-foreground)]"
  }`;
}

type SidebarProps = {
  isAdmin: boolean;
  isMobileOpen: boolean;
  onLogout: () => void;
  onMobileOpenChange: (isOpen: boolean) => void;
};

function SidebarContent({
  isAdmin,
  onLogout,
  onNavigate,
}: {
  isAdmin: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const visibleItems = isAdmin ? adminNavigationItems : navigationItems;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <NavLink
        className="focus-ring flex min-h-14 items-center rounded-2xl border border-border bg-[var(--app-subtle)] px-3 text-foreground"
        onClick={onNavigate}
        to={isAdmin ? "/admin" : "/dashboard"}
      >
        <BrandMark isAdmin={isAdmin} />
      </NavLink>

      <nav
        aria-label={isAdmin ? "Admin navigation" : "User navigation"}
        className="no-scrollbar mt-6 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              className={navClassName(isAdmin)}
              end={item.href === "/admin" || item.href === "/workouts"}
              key={item.href}
              onClick={onNavigate}
              to={item.href}
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isAdmin ? "text-primary" : "text-volt-400"
                      }`}
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
        <button
          className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-xl border border-border bg-[var(--app-subtle)] px-3.5 text-sm font-bold text-muted-foreground transition hover:border-primary/30 hover:bg-[var(--app-subtle-hover)] hover:text-foreground"
          onClick={() => {
            onLogout();
            onNavigate?.();
          }}
          type="button"
        >
          <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>

        <div className="rounded-2xl border border-border bg-[linear-gradient(145deg,hsl(var(--primary)/0.055),var(--app-subtle))] p-3.5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            <p className="text-sm font-semibold text-foreground">
              {isAdmin ? "Admin controls" : "Daily coach"}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {isAdmin
              ? "Manage videos, plans, users, and content from one workspace."
              : "Log food, start workouts, and review progress without hunting."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  isAdmin,
  isMobileOpen,
  onLogout,
  onMobileOpenChange,
}: SidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-[var(--app-sidebar)] px-4 py-5 text-[var(--app-sidebar-foreground)] backdrop-blur-xl md:block">
        <SidebarContent isAdmin={isAdmin} onLogout={onLogout} />
      </aside>

      <Sheet isOpen={isMobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent className="bg-[var(--app-sidebar)] text-[var(--app-sidebar-foreground)]">
          <SheetClose onClick={() => onMobileOpenChange(false)} />
          <SidebarContent
            isAdmin={isAdmin}
            onLogout={onLogout}
            onNavigate={() => onMobileOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
