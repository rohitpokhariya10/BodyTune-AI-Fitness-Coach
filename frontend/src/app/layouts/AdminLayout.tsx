import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppShell } from "@/shared/layout/AppShell";

export function AdminLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    auth.logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <AppShell
      isAdmin
      onLogout={handleLogout}
      roleLabel="Admin"
      userName={auth.user?.name ?? "Admin"}
    />
  );
}
