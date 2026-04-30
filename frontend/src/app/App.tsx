import { Suspense } from "react";

import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppRoutes } from "@/app/routes";
import { LoadingState } from "@/shared/ui/LoadingState";

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  );
}
