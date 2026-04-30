import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { LoadingState } from "@/shared/ui/LoadingState";

export function AdminRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <LoadingState />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/admin/login" />;
  }

  if (auth.role !== "admin") {
    return <Navigate replace to="/dashboard" />;
  }

  return children;
}
