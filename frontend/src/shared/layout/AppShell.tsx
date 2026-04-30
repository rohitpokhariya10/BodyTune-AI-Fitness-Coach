import { Outlet } from "react-router-dom";
import { useState } from "react";

import { AnimatedBackground } from "../ui/AnimatedBackground";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AppShellProps = {
  isAdmin: boolean;
  onLogout: () => void;
  roleLabel: string;
  userName: string;
};

export function AppShell({
  isAdmin,
  onLogout,
  roleLabel,
  userName,
}: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <AnimatedBackground />
      <Sidebar
        isAdmin={isAdmin}
        isMobileOpen={isMobileOpen}
        onLogout={onLogout}
        onMobileOpenChange={setIsMobileOpen}
      />
      <div className="min-h-screen min-w-0 md:pl-72">
        <Topbar
          isAdmin={isAdmin}
          onMobileMenuOpen={() => setIsMobileOpen(true)}
          onLogout={onLogout}
          roleLabel={roleLabel}
          userName={userName}
        />
        <main className="app-main no-scrollbar mx-auto w-full max-w-[92rem] px-4 pb-14 pt-5 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
