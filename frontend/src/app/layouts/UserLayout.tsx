import { ProtectedRoute } from "@/app/guards/ProtectedRoute";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppShell } from "@/shared/layout/AppShell";
import { Navigate, useNavigate } from "react-router-dom";

export function UserLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    auth.logout();
    navigate("/login", { replace: true });
  }

  if (!auth.isLoading && auth.isAuthenticated && auth.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  return (
    <ProtectedRoute>
      <AppShell
        isAdmin={false}
        onLogout={handleLogout}
        roleLabel="User"
        userName={auth.user?.name ?? "Guest"}
      />
    </ProtectedRoute>
  );
}
