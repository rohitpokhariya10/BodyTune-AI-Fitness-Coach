import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
