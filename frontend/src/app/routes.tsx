import { AnimatePresence, motion } from "framer-motion";
import { lazy, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import { AdminRoute } from "@/app/guards/AdminRoute";
import { AdminLayout } from "@/app/layouts/AdminLayout";
import { PublicLayout } from "@/app/layouts/PublicLayout";
import { UserLayout } from "@/app/layouts/UserLayout";

const AdminPanelPage = lazy(() => import("@/pages/AdminPanelPage"));
const AIPlanPage = lazy(() => import("@/pages/AIPlanPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const DietPage = lazy(() => import("@/pages/DietPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LiveWorkoutPage = lazy(() => import("@/pages/LiveWorkoutPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const SubscriptionPage = lazy(() => import("@/pages/SubscriptionPage"));
const VerifyOtpPage = lazy(() => import("@/pages/VerifyOtpPage"));
const VideoLibraryPage = lazy(() => import("@/pages/VideoLibraryPage"));
const VideoWatchPage = lazy(() => import("@/pages/VideoWatchPage"));
const WorkoutSelectionPage = lazy(() => import("@/pages/WorkoutSelectionPage"));

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function withTransition(children: ReactNode) {
  return <PageTransition>{children}</PageTransition>;
}

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes key={location.pathname} location={location}>
        <Route element={<PublicLayout />}>
          <Route element={withTransition(<LandingPage />)} path="/" />
          <Route element={withTransition(<LoginPage />)} path="/login" />
          <Route element={withTransition(<LoginPage />)} path="/admin/login" />
          <Route element={withTransition(<RegisterPage />)} path="/register" />
          <Route element={withTransition(<VerifyOtpPage />)} path="/verify-otp" />
          <Route
            element={withTransition(<ForgotPasswordPage />)}
            path="/forgot-password"
          />
          <Route
            element={withTransition(<ResetPasswordPage />)}
            path="/reset-password"
          />
        </Route>

        <Route element={<UserLayout />}>
          <Route element={withTransition(<DashboardPage />)} path="/dashboard" />
          <Route element={withTransition(<ProfilePage />)} path="/profile" />
          <Route element={withTransition(<WorkoutSelectionPage />)} path="/workouts" />
          <Route element={withTransition(<LiveWorkoutPage />)} path="/workouts/live" />
          <Route element={withTransition(<DietPage />)} path="/diet" />
          <Route element={withTransition(<AIPlanPage />)} path="/ai-plan" />
          <Route element={withTransition(<VideoLibraryPage />)} path="/library" />
          <Route
            element={withTransition(<VideoWatchPage />)}
            path="/library/videos/:videoId"
          />
          <Route element={withTransition(<SubscriptionPage />)} path="/subscription" />
          <Route element={withTransition(<ResultsPage />)} path="/results" />
          <Route element={withTransition(<SettingsPage />)} path="/settings" />
        </Route>

        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route element={withTransition(<SettingsPage />)} path="/admin/settings" />
          <Route element={withTransition(<AdminPanelPage />)} path="/admin/*" />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
